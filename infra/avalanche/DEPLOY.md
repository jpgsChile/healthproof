# Runbook de Despliegue — Hygieia L1

> **Fuente de verdad** para crear, recrear y operar la red Hygieia.
> Si seguís este documento de arriba a abajo, obtenés una chain idéntica desde cero.
>
> Última actualización: 2026-08-02

---

## Índice

- [0. Por qué existe este documento](#0-por-qué-existe-este-documento)
- [1. Decisiones de arquitectura](#1-decisiones-de-arquitectura)
- [2. Prerrequisitos](#2-prerrequisitos)
- [3. Generación de claves](#3-generación-de-claves)
- [4. Preparar el genesis](#4-preparar-el-genesis)
- [5. Provisionar el servidor](#5-provisionar-el-servidor)
- [6. Crear y desplegar la L1](#6-crear-y-desplegar-la-l1)
- [7. Configurar el nodo](#7-configurar-el-nodo)
- [8. Verificación](#8-verificación)
- [9. Registrar el despliegue](#9-registrar-el-despliegue)
- [10. Desplegar contratos](#10-desplegar-contratos)
- [11. Explorer (Blockscout)](#11-explorer-blockscout)
- [12. Agregar validadores](#12-agregar-validadores)
- [13. Recuperación de desastre](#13-recuperación-de-desastre)

---

## 0. Por qué existe este documento

La chain Hygieia se perdió **tres veces**:

| # | Causa | Consecuencia |
|---|---|---|
| 1 | Reboot de la máquina | `blockchainID` nuevo, 11 contratos redesplegados |
| 2 | Reboot de la máquina | `blockchainID` nuevo, 11 contratos redesplegados |
| 3 | Cuenta AWS suspendida | Acceso perdido a genesis y config |

La causa raíz de 1 y 2 está documentada en el propio `avalanche-cli`:

> "The local network will run until calling `network stop`, `network clean`, **or until machine reboot**"

Se estaba usando una herramienta de **prototipado efímero** como si fuera infraestructura.

La causa raíz de 3 es que **la infraestructura no estaba en el repo**. Vivía en una máquina.

**Regla de oro de este runbook: el activo no es el servidor corriendo, es poder recrearlo idénticamente.** Si perdés el servidor y no podés recrearlo en < 1 hora, no tenés infraestructura.

---

## 1. Decisiones de arquitectura

| Decisión | Valor | Razón |
|---|---|---|
| Red base | **Fuji** (`network-id: fuji`) | Persistente. Sobrevive reboots. Verificable públicamente. AVAX del faucet es gratis. |
| ~~Red local~~ | ❌ **Prohibida** | Se destruye en cada reboot. Causó 2 de las 3 pérdidas. |
| EVM Chain ID | `21668` | Continuidad con la config existente del frontend |
| Token nativo | `HVE` | Ver ⚠️ abajo |
| Validadores (PoC) | 1 | Suficiente para prueba de concepto. Sin tolerancia a fallos. |
| Sync de Primary Network | **Parcial** (`partial-sync-primary-network: true`) | Solo P-Chain. Sin X-Chain ni C-Chain. Reduce disco drásticamente. |
| Fees | `minBaseFee` 1 gwei + relayer prefondeado | Anti-spam sin costo real. Pacientes nunca pagan. |
| `TxAllowList` | ❌ No en genesis | Se puede activar después vía `upgrade.json`. Activarla prematuramente te puede dejar afuera de tu propia chain. |

### ⚠️ El símbolo `HVE` NO está en el genesis

Esto sorprende a muchos: **el genesis de Subnet-EVM no tiene campo de símbolo de token.** `HVE` es metadata de cliente y vive en tres lugares:

1. El `sidecar.json` de `avalanche-cli` (`~/.avalanche-cli/subnets/hygieia/sidecar.json`)
2. La config del frontend (`apps/frontend/healthproof-frontend/.env`)
3. El registro en Chainlist / la wallet del usuario

Si buscás `HVE` dentro de `genesis.json` no lo vas a encontrar, y está bien.

### Sync parcial: qué significa para el disco

Tu estimación de ~70 GB era alta. Los requisitos oficiales para un nodo de L1 de bajo tráfico (< 10 TPS) son:

| Componente | Requisito |
|---|---|
| CPU | 2 cores |
| RAM | 4 GB |
| **Storage** | **100 GB** |
| Red | 25 Mbps |

Y la doc aclara: *"L1 validators sync the P-Chain to track validator sets and cross-chain messages. This adds **minimal overhead** to the requirements above."*

Los números de 500 GB / 12.5 TB que circulan corresponden a validadores de **Primary Network** (que sí corren P + X + C completas). **No es tu caso.**

---

## 2. Prerrequisitos

```bash
# Avalanche CLI
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s
export PATH=~/bin:$PATH

# Verificar
avalanche --version
```

También necesitás: `aws` CLI configurada, `jq`, y Node.js 18+ para los contratos.

---

## 3. Generación de claves

### 🔴 CRÍTICO: nunca uses la clave `ewoq`

El deployer anterior era `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC`, cuya clave privada es
`0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027`.

**Esa es la clave `ewoq`: está publicada en la documentación oficial de Avalanche.** Cualquier persona en el mundo la tiene.

En una red local descartable no importa. En una red **persistente** es catastrófico, porque ese address era:

- ADMIN en `IdentityRegistry`
- Owner de los proxies UUPS → **puede reemplazar la implementación de cualquier contrato**
- Titular del balance inicial

Con la chain vieja no perdiste nada porque igual se destruyó. **Pero si repetís esa clave en la chain persistente, entregás el protocolo completo.**

### Generar claves nuevas

Necesitás tres identidades separadas:

```bash
# 1. Deployer / Admin del protocolo
avalanche key create hygieia-deployer

# 2. Relayer (paga el gas de los usuarios vía ERC-2771)
avalanche key create hygieia-relayer

# 3. Owner de la L1 en P-Chain (registra validadores)
avalanche key create hygieia-l1-owner

# Ver las direcciones generadas
avalanche key list --local --keys hygieia-deployer,hygieia-relayer,hygieia-l1-owner
```

> **No** commitees estas claves. Viven en `~/.avalanche-cli/key/`. Hacé backup cifrado fuera del repo.
> Para producción real, migrar a AWS KMS (el proyecto ya tiene `@aws-sdk/client-kms` como dependencia).

---

## 4. Preparar el genesis

El archivo `network/genesis.json` está versionado con **placeholders que DEBÉS reemplazar**:

| Placeholder | Reemplazar por |
|---|---|
| `0x1111111111111111111111111111111111111111` | Dirección de `hygieia-deployer` |
| `0x2222222222222222222222222222222222222222` | Dirección de `hygieia-relayer` |

```bash
cd infra/avalanche/network

DEPLOYER=0x...   # de avalanche key list
RELAYER=0x...

# En "config" las direcciones van CON 0x; en "alloc" van SIN 0x.
# Reemplazamos primero las de alloc (sin 0x) y después las de config (con 0x).
sed -i \
  -e "s/\"1111111111111111111111111111111111111111\"/\"${DEPLOYER#0x}\"/g" \
  -e "s/\"2222222222222222222222222222222222222222\"/\"${RELAYER#0x}\"/g" \
  -e "s/\"0x1111111111111111111111111111111111111111\"/\"$DEPLOYER\"/g" \
  -e "s/\"0x2222222222222222222222222222222222222222\"/\"$RELAYER\"/g" \
  genesis.json
```

> El orden importa: si reemplazás primero las versiones con `0x`, el patrón sin prefijo
> ya no coincide. Verificá con `jq . genesis.json` que el JSON siga siendo válido.

### ✅ Pre-flight check obligatorio

**No sigas si esto devuelve algo:**

```bash
grep -E "0x1{40}|0x2{40}|1{40}|2{40}" genesis.json && \
  echo "❌ ABORTAR: quedan placeholders sin reemplazar" || \
  echo "✅ Genesis listo"
```

Este check existe porque desplegar con placeholders significa una chain **sin ninguna cuenta que controles**. Se detecta recién al intentar desplegar contratos, cuando ya gastaste el deploy.

### Contenido del genesis

| Sección | Qué hace |
|---|---|
| `chainId: 21668` | Identidad EVM de la chain |
| `feeConfig.minBaseFee: 1000000000` | Piso de 1 gwei. Anti-spam. |
| `feeConfig.targetBlockRate: 2` | Bloque cada 2 segundos |
| `warpConfig` | Requerido post-Etna para el Validator Manager e ICM |
| `feeManagerConfig` | Permite **cambiar las fees on-chain** sin network upgrade. Clave para tu modelo de negocio. |
| `contractDeployerAllowListConfig` | Solo el deployer puede desplegar contratos |
| `alloc` | Prefondea deployer y relayer con 1.000.000 HVE cada uno |

> ⚠️ **Verificar contra tu versión de `subnet-evm`**: el campo `warpConfig.requirePrimaryNetworkSigners` puede ser requerido en versiones recientes. Consultá la doc de tu versión antes de desplegar.

### Predeploys del Validator Manager

Una L1 post-Etna necesita un `TransparentUpgradeableProxy` predesplegado en `0xfacade00...0000` con su `ProxyAdmin` en `0xdad0000...0000`, porque la transacción `ConvertSubnetToL1Tx` recibe esa dirección como parámetro.

Ese bytecode lo **inyecta la herramienta**, no está en nuestro `genesis.json`. Después de correr `avalanche blockchain create` (paso 6), verificá que aparezca:

```bash
jq '.alloc | keys' ~/.avalanche-cli/subnets/hygieia/genesis.json | grep -i facade
```

**Cuando el genesis final esté generado, commiteálo.** Ese archivo es la definición real de tu chain.

---

## 5. Provisionar el servidor

### Sizing y costo

Precios aproximados AWS `us-east-1` on-demand. **Verificá en la calculadora de AWS, cambian.**

| Setup | Especificación | Costo/mes | Runway con $100 |
|---|---|---|---|
| **Recomendado PoC** | t3.medium (2 vCPU, 4 GB) + 100 GB gp3 | **~$38** | **~2.6 meses** |
| Nodo + Blockscout | t3.large (2 vCPU, 8 GB) + 100 GB gp3 | ~$69 | ~1.4 meses |
| Referencia avalanche-deploy | 7x c6a.xlarge | ~$780 | 4 días |
| Instancia detenida | Solo EBS 100 GB | ~$8 | ~12 meses |

**Recomendación con $100: `t3.medium` para el nodo solo.** Corré Blockscout localmente en tu máquina con Docker apuntando al RPC remoto (ver paso 11) — te ahorra el costo entero y para demos presenciales alcanza perfecto.

### Security Group

| Puerto | Protocolo | Origen | Uso |
|---|---|---|---|
| 2222 | TCP | Tu IP `/32` | SSH (puerto no estándar) |
| 9651 | TCP | `0.0.0.0/0` | P2P Avalanche — **debe ser público** |
| 443 | TCP | `0.0.0.0/0` | RPC vía nginx + TLS |
| ~~22~~ | — | — | **Eliminar la regla** |
| ~~9650~~ | — | — | **No exponer.** Solo localhost + nginx |

El hardening completo del sistema operativo está en [`HARDENING.md`](HARDENING.md).

---

## 6. Crear y desplegar la L1

### 6.1 Obtener AVAX en Fuji

Necesitás **~1.5 AVAX en la P-Chain de Fuji** (1 por validador + fees).

1. Faucet: https://core.app/tools/testnet-faucet/ (o el faucet de build.avax.network)
2. El faucet entrega AVAX en **C-Chain**. Hay que transferir a **P-Chain**:

```bash
avalanche key transfer --fuji --key hygieia-l1-owner --amount 1.5
```

### 6.2 Crear la configuración de la blockchain

```bash
avalanche blockchain create hygieia \
  --evm \
  --genesis infra/avalanche/network/genesis.json \
  --evm-token HVE \
  --fuji
```

Verificá los predeploys del Validator Manager (ver paso 4) antes de continuar.

### 6.3 Desplegar en Fuji

```bash
avalanche blockchain deploy hygieia \
  --fuji \
  --key hygieia-l1-owner \
  --use-local-machine
```

> Los flags del CLI cambian entre versiones. Corré `avalanche blockchain deploy --help` y ajustá.

Al terminar imprime el **RPC URL**, el `SubnetID` y el `BlockchainID`. **Guardalos** (paso 9).

---

## 7. Configurar el nodo

### 7.1 Config de avalanchego

Copiá `network/node-config.json` al servidor y reemplazá `__SUBNET_ID__`:

```bash
scp -P 2222 infra/avalanche/network/node-config.json \
  ubuntu@<IP>:/home/ubuntu/.avalanchego/configs/node.json

# En el servidor
sed -i "s/__SUBNET_ID__/<SubnetID>/" ~/.avalanchego/configs/node.json
```

Los tres campos que evitan que repitas el desastre:

```json
"network-id": "fuji",
"partial-sync-primary-network": true,
"track-subnets": "<SubnetID>"
```

### 7.2 Config de la chain (Subnet-EVM)

```bash
mkdir -p ~/.avalanchego/configs/chains/<BlockchainID>
scp -P 2222 infra/avalanche/network/chain-config.json \
  ubuntu@<IP>:/home/ubuntu/.avalanchego/configs/chains/<BlockchainID>/config.json
```

### 7.2b Nota sobre `subnet-config.json`

El archivo existente tiene `k: 25` / `alpha: 18`, valores pensados para ~25 validadores. Con 1 validador AvalancheGo muestrea los que existan, así que **no rompe**, pero los números no describen tu red real.

Cuando pases a varios validadores, revisá esos parámetros. Y ojo con `allowedNodes: []` + `validatorOnly: false`: significa que cualquier nodo puede sincronizar, lo cual contradice el modelo permisionado si más adelante querés restringirlo.

### 7.3 Servicio systemd — el paso que te salva del reboot

```ini
# /etc/systemd/system/avalanchego.service
[Unit]
Description=AvalancheGo (Hygieia L1)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/avalanchego/avalanchego --config-file=/home/ubuntu/.avalanchego/configs/node.json
Restart=always
RestartSec=10
LimitNOFILE=32768

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable avalanchego   # ← arranca solo tras un reboot
sudo systemctl start avalanchego
```

> `systemctl enable` es literalmente lo que faltaba las dos primeras veces. Sin eso, un reboot deja el nodo apagado.

---

## 8. Verificación

```bash
# ¿En qué red está el nodo? Debe decir "fuji" / 5
curl -X POST --data '{"jsonrpc":"2.0","id":1,"method":"info.getNetworkName"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/info

# ¿Bootstrapeó la P-Chain?
curl -X POST --data '{"jsonrpc":"2.0","id":1,"method":"info.isBootstrapped","params":{"chain":"P"}}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/info

# ¿Responde la chain con el chainId correcto? Debe devolver 0x54a4 (21668)
curl -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' \
  -H 'content-type:application/json' \
  127.0.0.1:9650/ext/bc/<BlockchainID>/rpc

# ¿Avanzan los bloques? Correr dos veces y comparar
curl -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber"}' \
  -H 'content-type:application/json' \
  127.0.0.1:9650/ext/bc/<BlockchainID>/rpc
```

### 🔴 Test de persistencia — no lo saltees

Es la prueba de que resolviste el problema de fondo:

```bash
BEFORE=$(curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/bc/<BlockchainID>/rpc)

sudo reboot

# Esperar ~2 min, reconectar y comparar
```

**El `BlockchainID` debe ser el mismo y el número de bloque debe ser ≥ al anterior.** Si el `BlockchainID` cambió, estás en red local otra vez y algo salió mal.

---

## 9. Registrar el despliegue

Creá y **commiteá** `network/deployment.json`:

```json
{
  "network": "fuji",
  "chainName": "hygieia",
  "evmChainId": 21668,
  "tokenSymbol": "HVE",
  "subnetId": "",
  "blockchainId": "",
  "validatorManagerAddress": "0xfacade0000000000000000000000000000000000",
  "rpcUrl": "",
  "nodeId": "",
  "deployedAt": "",
  "genesisSha256": "",
  "validators": 1
}
```

Hash del genesis para detectar drift:

```bash
sha256sum infra/avalanche/network/genesis.json
```

---

## 10. Desplegar contratos

```bash
cd infra/avalanche/contracts

# .env (NO commitear)
# PRIVATE_KEY=<clave de hygieia-deployer>
# HYGIEIA_RPC_URL=https://<dominio>/ext/bc/<BlockchainID>/rpc

npm install
npm run build
npm run deploy:healthproof:hygieia
```

Actualizar con las direcciones nuevas:

- `infra/avalanche/network/hygieia.config.json`
- `infra/avalanche/contracts/hardhat.config.ts` (red `hygieia`)
- `apps/frontend/healthproof-frontend/.env`
- `apps/frontend/healthproof-frontend/src/lib/env.ts`

### Pendiente de producto: conectar el relayer

Los contratos ya soportan meta-transacciones:

- `src/metatx/HealthProofTrustedForwarder.sol` — `ERC2771Forwarder`
- `src/core/HealthProofGateway.sol` — hereda `ERC2771Context`, usa `_msgSender()` en todos los modifiers

Pero el frontend **no firma `ForwardRequest` ni llama al forwarder**. Hasta que eso se implemente, el paciente paga su propio gas. Es la última pieza para el flujo gasless.

---

## 11. Explorer (Blockscout)

### Opción A: local, gratis (recomendada con $100)

```bash
git clone https://github.com/blockscout/blockscout
cd blockscout/docker-compose

# Apuntar ETHEREUM_JSONRPC_HTTP_URL al RPC de Hygieia
# en envs/common-blockscout.env

docker compose up -d
# Explorer en http://localhost
```

### Opción B: en el servidor (para que el cliente entre solo)

Ava Labs mantiene `avalanche-deploy`, un toolkit de IaC con **Blockscout como add-on integrado**:

```bash
source l1.env
make deploy-blockscout CHAIN_ID=$CHAIN_ID EVM_CHAIN_ID=21668 CHAIN_NAME="Hygieia"
```

Despliega backend indexer, frontend, stats service y nginx vía Docker Compose. Requiere ~4 GB extra de RAM.

**Para un cliente, `explorer.healthproof.io` propio es más convincente que estar listado en Avascan** — y encima es coherente con el discurso de red permisionada para datos médicos.

---

## 12. Agregar validadores

Cada centro médico o laboratorio puede correr su propio validador:

```bash
avalanche blockchain addValidator hygieia --fuji --key hygieia-l1-owner
```

Requisitos por validador:

- Instancia con el sizing del paso 5
- `node-config.json` con el mismo `track-subnets`
- El mismo `genesis.json` (de ahí la importancia de tenerlo versionado)
- ~1 AVAX en P-Chain para el balance del validador

Con 1 validador la chain **para** si el nodo cae. Para tolerancia a fallos real hacen falta ≥ 5.

> ⚠️ **A verificar**: post-ACP-77 los validadores de L1 pagan una fee continua y su balance se drena con el tiempo. Antes de planificar apagar la instancia entre demos, confirmá cómo afecta al registro del validador.

---

## 13. Recuperación de desastre

Si perdés el servidor o la cuenta cloud:

| Paso | Acción | Tiempo |
|---|---|---|
| 1 | Provisionar instancia nueva (paso 5) | 10 min |
| 2 | Instalar avalanchego + configs del repo (paso 7) | 10 min |
| 3 | Restaurar claves del backup cifrado | 5 min |
| 4 | Sync parcial de P-Chain | ~minutos |
| 5 | Reanudar desde el `BlockchainID` de `deployment.json` | — |

**La chain sigue existiendo** porque está registrada en la P-Chain de Fuji. No se recrea: se **reanuda**.

Esa es la diferencia con lo anterior. Antes, perder el servidor era perder la chain. Ahora es reponer una máquina.

### Qué debe estar siempre en el repo

- [x] `network/genesis.json` — definición de la chain
- [x] `network/node-config.json` — config de avalanchego
- [x] `network/chain-config.json` — config de Subnet-EVM
- [ ] `network/deployment.json` — IDs del despliegue (crear en paso 9)
- [x] `DEPLOY.md` — este runbook
- [x] `contracts/src/**` — contratos

### Qué NUNCA va al repo

- Claves privadas (`~/.avalanche-cli/key/`)
- Archivos `.env`
- Certificados de staking del nodo (`staker.key`, `staker.crt`) — **hacé backup cifrado aparte**: perderlos cambia el `NodeID`

---

## Referencias

- [Avalanche CLI](https://build.avax.network/docs/tooling/avalanche-cli)
- [avalanche-deploy (IaC oficial)](https://github.com/ava-labs/avalanche-deploy)
- [System Requirements](https://build.avax.network/docs/nodes/system-requirements)
- [Subnet-EVM genesis](https://docs.avax.network/docs/avalanche-l1s/evm-configuration/customize-avalanche-l1)
- [Blockscout en Avalanche](https://docs.blockscout.com/setup/deployment/avalanche-chains)
- [`HARDENING.md`](HARDENING.md) — hardening del servidor
- [`../../docs/network-roadmap.md`](../../docs/network-roadmap.md) — roadmap de red
