# Creación de Hygieia L1 — Comandos Concretos

> Guía de ejecución paso a paso para **este** entorno.
> Para el contexto y las decisiones de arquitectura, ver [`DEPLOY.md`](DEPLOY.md).
>
> Fecha: 2026-08-02

---

## Entorno objetivo

| Ítem | Valor |
|---|---|
| SO | Amazon Linux 2023 |
| Usuario | `ec2-user` |
| Home | `/home/ec2-user` |
| Avalanche CLI | `1.9.6` (instalado en `/home/ec2-user/bin/avalanche`) |
| Address principal | `0xe81461cB96b1503977E6a88b6509A47615c5bD00` |
| Balance P-Chain | 6.5 AVAX ✅ |
| Balance C-Chain | 0.5 AVAX ✅ |
| Red base | Fuji |
| EVM Chain ID | `21668` |
| Token nativo | `HVE` |
| Validadores | 1 (PoC) |

**6.5 AVAX en P-Chain alcanza de sobra.** Se necesita para: `CreateSubnetTx` + `CreateChainTx` + `ConvertSubnetToL1Tx` + ~1 AVAX de balance del validador.

---

## ⚠️ Advertencia de seguridad antes de empezar

El paso 1 importa tu clave privada **al disco de la EC2** (`~/.avalanche-cli/key/`). La CLI lo dice explícitamente:

> "CLI is going to store the key on your file system. Whoever gets access to that key is going to have access to all funds secured by that private key."

**Antes de continuar, respondé esto:** ¿el address `0xe81461...` tiene fondos en **Mainnet** de alguna red (Avalanche, Ethereum, etc.)?

- **Si NO** → seguí. Los AVAX de Fuji son gratis del faucet, el riesgo es cero.
- **Si SÍ** → **PARÁ.** Creá una clave nueva solo para Fuji, mandale AVAX del faucet y usá esa. Nunca pongas una clave con valor real en un servidor.

---

## Paso 0 — Preparar el sistema (Amazon Linux 2023)

```bash
# Persistir el PATH (si no, se pierde al reconectar por SSH)
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
avalanche --version   # debe imprimir 1.9.6

# Dependencias (AL2023 usa dnf, no apt)
sudo dnf install -y jq git tar gzip

# Node.js para desplegar los contratos más adelante
sudo dnf install -y nodejs npm
node --version
```

Traer el repo (o al menos `infra/avalanche/network/`) a la máquina:

```bash
cd ~
git clone https://github.com/jpgsChile/healthproof.git healthproof
cd healthproof
```

---

## Paso 1 — Cargar las claves

### 1.1 Importar tu clave principal (owner de la L1)

Exportá la clave privada de `0xe81461cB96b1503977E6a88b6509A47615c5bD00` desde tu wallet (Core → Configuración → Seguridad y privacidad → Mostrar clave privada).0xdb799c8cda9b82b926f18cd7f6de5e3927efa3be1d0e7821723b12417907bb56
0x291139409c6b87b9079a28a1d86cffbb69f2e116d44360fa47313c872dbf24f6
```bash
# Escribir la clave en un archivo temporal con permisos restringidos
umask 077
cat > /tmp/hp-owner.pk
# Pegá la clave privada en hex SIN el prefijo 0x, dale Enter y luego Ctrl+D

# Importar a la CLI
avalanche key create hygieia-owner --file /tmp/hp-owner.pk

# Borrado seguro del temporal
shred -u /tmp/hp-owner.pk 2>/dev/null || rm -f /tmp/hp-owner.pk
```

### 1.2 Verificar que la CLI ve tu address y tus fondos

```bash
avalanche key list --fuji
```

**Punto de control:** en la fila `hygieia-owner` la línea de `C-Chain (Ethereum hex format)` debe decir exactamente:

```
0xe81461cB96b1503977E6a88b6509A47615c5bD00
```

Si no coincide, la clave importada no es la correcta. **No sigas.**

Anotá también la address `P-fuji1...` que aparece — es la que tiene tus 6.5 AVAX.

### 1.3 Crear una clave separada para el relayer

El relayer vive en el backend y paga el gas de los pacientes. **No debe compartir clave con el owner del protocolo**: si te comprometen el backend, no quiero que se lleven también el control de la L1.

```bash
avalanche key create hygieia-relayer
avalanche key list --fuji
```

Guardá la address hex del relayer:

```bash
RELAYER=0x754aC92E05e125d0299cB1528909aaC795Dd4757   # C-chain de la salida de avalanche key list
echo $RELAYER
```

---

## Paso 2 — Crear la configuración de la blockchain

### Por qué NO usamos `--genesis` acá

`DEPLOY.md` incluye un `genesis.json` versionado. **Pero no lo pasamos en este paso**, y la razón es concreta:

Una L1 soberana post-Etna necesita un `TransparentUpgradeableProxy` predesplegado en `0xfacade00...` con su `ProxyAdmin`, porque `ConvertSubnetToL1Tx` recibe esa dirección como parámetro. **Ese bytecode lo inyecta la CLI al generar el genesis.** Si le pasamos un genesis propio, corremos el riesgo de que no lo inyecte y la conversión a L1 falle — después de haber gastado las transacciones de P-Chain.

Estrategia más segura: **dejamos que la CLI genere el genesis correcto, y después le parchamos nuestra config económica.** El resultado se commitea y ése pasa a ser la fuente de verdad.

### 2.1 Generar

```bash
avalanche blockchain create hygieia \
  --evm \
  --latest \
  --evm-chain-id 21668 \
  --evm-token HVE \
  --production-defaults \
  --proof-of-authority \
  --validator-manager-owner 0xe81461cB96b1503977E6a88b6509A47615c5bD00 \
  --proxy-contract-owner 0xe81461cB96b1503977E6a88b6509A47615c5bD00 \
  --warp \
  --icm=false
```

| Flag | Por qué |
|---|---|
| `--evm --latest` | Subnet-EVM en su última versión |
| `--evm-chain-id 21668` | Continuidad con el frontend existente |
| `--evm-token HVE` | Símbolo del token nativo |
| `--production-defaults` | Parámetros de producción, no de test |
| `--proof-of-authority` | Red permisionada: vos autorizás validadores. Correcto para datos médicos. |
| `--validator-manager-owner` | Tu address controla quién valida |
| `--proxy-contract-owner` | Tu address controla upgrades del ValidatorManager |
| `--icm=false` | Sin mensajería entre chains por ahora. Evita desplegar contratos Teleporter innecesarios. |

### 2.2 Verificar los predeploys — control obligatorio

```bash
GEN=~/.avalanche-cli/subnets/hygieia/genesis.json

# Debe listar una address que empiece con "facade"
jq -r '.alloc | keys[]' $GEN | grep -i facade

# Confirmar chainId
jq '.config.chainId' $GEN     # → 21668
```

**Si el `grep` de `facade` no devuelve nada, no sigas.** Sin el proxy predesplegado la conversión a L1 va a fallar. Revisá la salida de `blockchain create` buscando errores.

---

## Paso 3 — Parchar el genesis con nuestra config

Ahora sí aplicamos las decisiones de `DEPLOY.md`: fee bajo, control de fees on-chain, deploy restringido y prefondeo del relayer.

```bash
GEN=~/.avalanche-cli/subnets/hygieia/genesis.json
OWNER=0xe81461cB96b1503977E6a88b6509A47615c5bD00
# RELAYER ya está en la variable del paso 1.3

cp $GEN ${GEN}.bak

jq --arg owner "$OWNER" \
   --arg relayer_nopfx "${RELAYER#0x}" '
  .config.feeConfig.minBaseFee = 1000000000
  | .config.feeManagerConfig = {
      "blockTimestamp": 0,
      "adminAddresses": [$owner]
    }
  | .config.contractDeployerAllowListConfig = {
      "blockTimestamp": 0,
      "adminAddresses": [$owner]
    }
  | .alloc[$relayer_nopfx] = { "balance": "0xd3c21bcecceda1000000" }
' ${GEN}.bak > $GEN

# Verificar
jq '{
  chainId: .config.chainId,
  minBaseFee: .config.feeConfig.minBaseFee,
  feeManager: .config.feeManagerConfig.adminAddresses,
  deployerAllowList: .config.contractDeployerAllowListConfig.adminAddresses,
  allocCount: (.alloc | length)
}' $GEN
```

| Cambio | Efecto |
|---|---|
| `minBaseFee: 1000000000` | Piso de 1 gwei. Anti-spam, pero el relayer gasta poquísimo HVE. |
| `feeManagerConfig` | Podés **cambiar las fees on-chain sin network upgrade**. Directamente tu modelo de negocio. |
| `contractDeployerAllowListConfig` | Solo tu address puede desplegar contratos |
| `alloc[relayer]` | 1.000.000 HVE al relayer para pagar el gas de los pacientes |

### 3.1 Commitear el genesis final — este es el paso que te salva

```bash
cp $GEN ~/healthproof/infra/avalanche/network/genesis.json
cd ~/healthproof
sha256sum infra/avalanche/network/genesis.json

git add infra/avalanche/network/genesis.json
git commit -m "chore(infra): commit generated Hygieia L1 genesis"
```

> Este archivo es la **definición de tu chain**. Es exactamente lo que no tenías las tres veces que perdiste todo. Guardá el hash SHA256 para el paso 7.

---

## Paso 4 — Desplegar en Fuji

```bash
avalanche blockchain deploy hygieia \
  --fuji \
  --key hygieia-owner \
  --use-local-machine
```

Qué hace: `CreateSubnetTx` → `CreateChainTx` → `ConvertSubnetToL1Tx`, sincroniza esta máquina como validador bootstrap e inicializa el contrato Validator Manager.

> Los flags cambian entre versiones de la CLI. Si algo falla, corré `avalanche blockchain deploy --help` y ajustá.

### Anotar la salida — no la pierdas

Al terminar imprime tres valores. **Copialos ahora mismo:**

```text
Subnet ID:     ____________________________________
Blockchain ID: ____________________________________
RPC URL:       ____________________________________
```

Si cerraste la terminal:

```bash
avalanche blockchain describe hygieia
```

---

## Paso 5 — Sobrevivir al reboot 🔴

**Este es el paso que faltó las dos primeras veces.** `--use-local-machine` arranca el nodo, pero **no necesariamente lo registra como servicio del sistema**. Si reinicia la máquina, el nodo queda apagado.

> Diferencia clave respecto de antes: ahora la **chain sigue existiendo** porque está registrada en la P-Chain de Fuji. Un reboot detiene el nodo, no destruye la chain. Pero igual queremos que arranque solo.

### 5.1 Averiguar cómo está corriendo el nodo

```bash
ps aux | grep -i avalanchego | grep -v grep
```

Anotá el **binario** y el **`--data-dir` / `--config-file`** que aparecen.

### 5.2 Verificar si ya hay servicio

```bash
systemctl list-units --type=service | grep -i avalanche
```

- **Si aparece uno** → `sudo systemctl enable <nombre>` y listo.
- **Si no aparece nada** → creá el unit del paso 5.3.

### 5.3 Crear el servicio systemd

Reemplazá `__EXEC_START__` con la línea exacta que viste en 5.1:

```bash
sudo tee /etc/systemd/system/avalanchego.service > /dev/null <<'EOF'
[Unit]
Description=AvalancheGo (Hygieia L1 - Fuji)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=__EXEC_START__
Restart=always
RestartSec=10
LimitNOFILE=32768

[Install]
WantedBy=multi-user.target
EOF

sudo nano /etc/systemd/system/avalanchego.service   # pegar el ExecStart real

sudo systemctl daemon-reload
sudo systemctl enable avalanchego
sudo systemctl status avalanchego
```

> `systemctl enable` es literalmente el comando que faltó. Sin él, reboot = nodo apagado.

---

## Paso 6 — Verificación

```bash
BID=<Blockchain ID del paso 4>

# ¿En qué red está? Debe decir "fuji"
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"info.getNetworkName"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/info | jq

# ¿Bootstrapeó la P-Chain?
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"info.isBootstrapped","params":{"chain":"P"}}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/info | jq

# chainId → debe ser 0x54a4 (21668)
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/bc/$BID/rpc | jq

# Balance del owner en HVE
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xe81461cB96b1503977E6a88b6509A47615c5bD00","latest"]}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/bc/$BID/rpc | jq

# ¿Avanzan los bloques? Correr dos veces
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/bc/$BID/rpc | jq
```

### 6.1 Test de persistencia — el que de verdad importa

```bash
echo "Blockchain ID ANTES: $BID"
curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber"}' \
  -H 'content-type:application/json' 127.0.0.1:9650/ext/bc/$BID/rpc | jq -r .result

sudo reboot
```

Esperá ~3 minutos, reconectá y repetí las consultas.

| Resultado | Significado |
|---|---|
| Mismo `BID`, bloque ≥ anterior | ✅ **Chain persistente. Problema resuelto.** |
| Mismo `BID`, nodo apagado | ⚠️ La chain vive, falta arreglar systemd (paso 5) |
| `BID` distinto | 🔴 Estás en red local. Algo salió mal, revisá `--fuji` |

---

## Paso 7 — Registrar el despliegue

Completá `infra/avalanche/network/deployment.json` y commiteá:

```bash
cd ~/healthproof/infra/avalanche/network

jq --arg subnet "<SubnetID>" \
   --arg bid "<BlockchainID>" \
   --arg rpc "<RPC URL>" \
   --arg node "$(curl -s -X POST --data '{"jsonrpc":"2.0","id":1,"method":"info.getNodeID"}' -H 'content-type:application/json' 127.0.0.1:9650/ext/info | jq -r .result.nodeID)" \
   --arg sha "$(sha256sum genesis.json | cut -d' ' -f1)" \
   --arg relayer "$RELAYER" \
   --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  .subnetId = $subnet
  | .blockchainId = $bid
  | .rpcUrl = $rpc
  | .nodeId = $node
  | .genesisSha256 = $sha
  | .deployedAt = $now
  | .addresses.deployer = "0xe81461cB96b1503977E6a88b6509A47615c5bD00"
  | .addresses.l1Owner = "0xe81461cB96b1503977E6a88b6509A47615c5bD00"
  | .addresses.relayer = $relayer
' deployment.json > deployment.tmp && mv deployment.tmp deployment.json

cat deployment.json
cd ~/healthproof && git add -A && git commit -m "chore(infra): record Hygieia L1 Fuji deployment"
```

### Backup crítico del staking cert

Si perdés estos archivos, **cambia tu NodeID** y hay que re-registrar el validador:

```bash
find ~/.avalanche-cli ~/.avalanchego -name "staker*" 2>/dev/null
# Copialos cifrados FUERA del servidor y FUERA del repo
```

---

## Paso 8 — Exponer el RPC

El RPC escucha en `127.0.0.1:9650`, así que hoy solo es accesible desde la máquina. Para que el frontend lo use hace falta nginx + TLS.

Procedimiento completo en [`HARDENING.md`](HARDENING.md) sección 5.

Security Group mínimo:

| Puerto | Origen | Uso |
|---|---|---|
| 9651 | `0.0.0.0/0` | P2P Avalanche — **debe ser público** |
| 443 | `0.0.0.0/0` | RPC vía nginx + TLS |
| 22 | Tu IP `/32` | SSH |
| ~~9650~~ | — | **No exponer nunca** |

---

## Paso 9 — Contratos

```bash
cd ~/healthproof/infra/avalanche/contracts

cat > .env <<EOF
PRIVATE_KEY=<clave de 0xe81461...>
HYGIEIA_RPC_URL=https://<tu-dominio>/ext/bc/<BlockchainID>/rpc
EOF
chmod 600 .env

npm install
npm run build
npm run deploy:healthproof:hygieia
```

Actualizar después: `network/hygieia.config.json`, `network/deployment.json`, y en el frontend `.env` + `src/lib/env.ts`.

> **Pendiente de producto:** el relayer ERC-2771 sigue sin conectar. Los contratos están listos (`HealthProofTrustedForwarder`, `HealthProofGateway` con `ERC2771Context`), pero el frontend no firma `ForwardRequest`. Hasta entonces el paciente paga su propio gas.

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `avalanche: command not found` tras reconectar | PATH no persistido | Paso 0: agregar a `~/.bashrc` |
| `insufficient funds` al desplegar | AVAX en C-Chain, no en P-Chain | `avalanche key transfer --fuji --key hygieia-owner --amount 1` |
| `avalanche key list` muestra otra address | Clave importada incorrecta | Re-exportar de la wallet y repetir paso 1.1 |
| `grep facade` vacío | Genesis sin predeploy del VMC | No desplegar. Recrear con `-f` sin `--genesis` |
| `eth_chainId` devuelve otro valor | Chain distinta o `--evm-chain-id` mal | Verificar con `avalanche blockchain describe hygieia` |
| `BID` cambió tras reboot | Se desplegó en red local | Confirmar que se usó `--fuji` |
| Nodo no arranca tras reboot | Falta `systemctl enable` | Paso 5.3 |
| RPC no responde desde afuera | `http-host: 127.0.0.1` (correcto) | Configurar nginx (paso 8) |

---

## Checklist final

- [ ] PATH persistido en `.bashrc`
- [ ] Confirmado que la clave no tiene fondos de Mainnet
- [ ] `avalanche key list --fuji` muestra `0xe81461cB96b1503977E6a88b6509A47615c5bD00`
- [ ] Clave del relayer creada, separada del owner
- [ ] Genesis generado por la CLI **con** predeploy en `0xfacade...`
- [ ] Genesis parchado (`minBaseFee`, `feeManagerConfig`, alloc del relayer)
- [ ] **Genesis commiteado al repo**
- [ ] L1 desplegada en Fuji
- [ ] `SubnetID`, `BlockchainID` y `RPC URL` anotados
- [ ] `systemctl enable avalanchego` ejecutado
- [ ] **Test de reboot pasado: `BID` sin cambios**
- [ ] `deployment.json` completo y commiteado
- [ ] Staking cert respaldado fuera del servidor
- [ ] Security Group: 9651 abierto, 9650 cerrado
- [ ] Contratos desplegados y direcciones actualizadas
