# HealthProof — Roadmap de Red Blockchain

> Contexto y estrategia de red para Hygieia.
> El **procedimiento operativo** vive en [`infra/avalanche/DEPLOY.md`](../infra/avalanche/DEPLOY.md).
> Última actualización: 2026-08-02

---

## 1. Estado actual

**La chain no existe.** Se perdió tres veces y la última fue definitiva:

| # | Causa | Consecuencia |
|---|-------|--------------|
| 1 | Reboot de la máquina | `blockchainID` nuevo, 11 contratos redesplegados |
| 2 | Reboot de la máquina | `blockchainID` nuevo, 11 contratos redesplegados |
| 3 | Cuenta AWS suspendida | Acceso perdido a genesis, configs y nodo |

Estado de los activos:

| Activo | ¿Sobrevivió? |
|--------|--------------|
| Código de contratos | ✅ En el repo |
| Lógica de producto | ✅ En el repo |
| Genesis de la chain | ❌ Perdido (era autogenerado) |
| Estado de la chain | ❌ Perdido |
| Direcciones de contratos | ❌ Perdidas |

---

## 2. Causa raíz

Documentado en el propio `avalanche-cli`:

> "The local network will run until calling `network stop`, `network clean`, **or until machine reboot**"

Se usó una herramienta de **prototipado efímero** como infraestructura. Sumado a que **nada de la infra estaba versionada**, cada incidente obligó a reconstruir todo a mano.

**Lección: el activo no es el servidor corriendo, es poder recrearlo idénticamente.**

---

## 3. La corrección arquitectónica

Una versión previa de este documento proponía "migrar a Fuji" como paso hacia Mainnet, y trataba a Fuji como alternativa a tener red propia. **Eso confundía dos cosas distintas:**

| | Contratos **en Fuji C-Chain** | **Tu L1 con Fuji como red base** |
|---|---|---|
| Chain propia | ❌ Usás la de ellos | ✅ Hygieia sigue siendo tuya |
| Control de fees | ❌ AVAX a precio de mercado | ✅ Tu genesis, tu `feeConfig` |
| Token nativo | ❌ AVAX | ✅ HVE |
| Persistencia | ✅ | ✅ Sobrevive reboots |
| Indexable por Avascan | ✅ | ✅ |
| Costo del AVAX | Real | **Gratis (faucet)** |

**Decisión: Hygieia como L1 propia, anclada a la P-Chain de Fuji.** Mantiene todo el control de fees y token propio, y gana persistencia + verificabilidad pública.

### Persistencia y cantidad de nodos son ejes independientes

|  | **1 máquina** | **7 máquinas** |
|---|---|---|
| Red base **local** | Efímera. Muere en reboot. | Efímera igual. |
| Red base **Fuji** | **Persistente** | Persistente + tolerante a fallos |
| Red base **Mainnet** | Persistente | Producción real |

La cantidad de nodos determina **tolerancia a fallos**. La red base determina **persistencia**. No son lo mismo.

---

## 4. Sizing real y presupuesto

Requisitos oficiales para un nodo de L1 de bajo tráfico (< 10 TPS): **2 cores, 4 GB RAM, 100 GB storage**. La doc aclara que el sync de P-Chain "adds minimal overhead".

> Los números de 500 GB / 12.5 TB corresponden a validadores de **Primary Network** (P + X + C completas). No aplican a una L1 con `partial-sync-primary-network: true`.

Costos aproximados AWS `us-east-1` (verificar en la calculadora):

| Setup | Costo/mes | Runway con $100 |
|---|---|---|
| **t3.medium + 100 GB gp3 (recomendado PoC)** | **~$38** | **~2.6 meses** |
| t3.large + 100 GB gp3 (nodo + Blockscout) | ~$69 | ~1.4 meses |
| Referencia `avalanche-deploy` (7 nodos) | ~$780 | 4 días |
| Instancia detenida (solo EBS) | ~$8 | ~12 meses |

Con $100 se construye una **PoC persistente de 1 validador**, no producción. Es la categoría correcta para mostrar a clientes.

---

## 5. Riesgo crítico heredado: la clave `ewoq`

El deployer anterior era `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC` — la clave **`ewoq`, publicada en la documentación oficial de Avalanche**.

Ese address era ADMIN de `IdentityRegistry` y owner de todos los proxies UUPS, o sea que **cualquiera podía reemplazar la implementación de cualquier contrato**.

En una red local descartable era irrelevante. **En la red persistente sería entregar el protocolo.** Ver paso 3 de `DEPLOY.md`.

---

## 6. Roadmap

### Fase 0 — Reproducibilidad (costo $0) ✅
- [x] `genesis.json` versionado (`chainId 21668`, `feeConfig`, precompiles)
- [x] `node-config.json` (Fuji + partial sync + APIs endurecidas)
- [x] `chain-config.json` (pruning + state sync)
- [x] `deployment.json` (plantilla de registro)
- [x] `DEPLOY.md` (runbook completo)

### Fase 1 — Despliegue persistente
- [ ] Generar claves nuevas (deployer, relayer, l1-owner) — **nunca `ewoq`**
- [ ] Reemplazar placeholders del genesis + pre-flight check
- [ ] AVAX del faucet Fuji + transferencia C→P
- [ ] `avalanche blockchain create` + `deploy --fuji`
- [ ] Instalar configs y `systemctl enable avalanchego`
- [ ] **Test de persistencia: reboot y verificar que el `blockchainID` no cambie**
- [ ] Completar y commitear `deployment.json`

### Fase 2 — Contratos y producto
- [ ] Redeploy de los 11 contratos
- [ ] Actualizar `.env` y `src/lib/env.ts` del frontend
- [ ] **Conectar el relayer ERC-2771** (contratos listos, frontend no lo usa)

### Fase 3 — Demostrabilidad
- [ ] Blockscout (local para demos presenciales, o en servidor para acceso del cliente)
- [ ] Panel de verificación in-app (`txHash`, bloque, timestamp, link al explorer)

### Fase 4 — Escalamiento
- [ ] Sumar validadores (≥5 para tolerancia a fallos)
- [ ] Un nodo por centro médico / laboratorio
- [ ] Registrar en Chainlist
- [ ] Contactar a Routescan para indexación en Avascan
- [ ] Evaluar Mainnet cuando haya ingresos

---

## 7. Sobre Avascan

**Avascan / Routescan solo indexan L1s presentes en Mainnet o Fuji.** Se verificó la P-Chain de ambas: el `blockchainID` anterior no existía en ninguna, por eso no aparecía.

Aclaraciones:
- Avascan **no** usa subgraphs. Indexa directo desde el RPC de chains públicas.
- El listado se gestiona con **Routescan** (`hello@routescan.io`).
- No era un problema de SSH ni de nginx.

**Prioridad: baja.** Un Blockscout propio en `explorer.healthproof.io` es más convincente para un cliente médico que aparecer en un explorador público, y es coherente con el discurso de red permisionada. Avascan queda para cuando la red sea pública y haya tracción.

---

## 8. Plantilla de correo a Routescan/Avascan

> Enviar solo una vez la chain esté desplegada y persistente en **Fuji o Mainnet**.

**Para:** `hello@routescan.io`
**Asunto:** Request to index Avalanche L1 — Hygieia (Chain ID 21668)

```text
Hi Routescan/Avascan team,

We would like to request indexing and listing for our Avalanche L1 on Avascan.

Chain details:
- Name: Hygieia
- Chain ID: 21668
- Blockchain ID: [nuevo tras deploy en Fuji]
- Subnet ID: [nuevo tras deploy en Fuji]
- Network: Fuji (testnet)  // o Mainnet
- VM: Subnet-EVM
- RPC URL: https://[tu-dominio o IP]/ext/bc/[blockchainID]/rpc
- Native currency: HVE (18 decimals)
- Project website: https://...
- Short description: HealthProof — verifiable medical records & interoperability L1

Please let us know if you need chain logo, genesis config, or additional RPC endpoints.

Best regards,
[Tu nombre] — HealthProof
```

---

## 9. Resumen ejecutivo

1. **La chain no existe.** Se perdió 3 veces: 2 por reboot (red local de `avalanche-cli`), 1 por cuenta suspendida.
2. **La causa raíz no fue mala suerte:** la infra no estaba versionada y se usó una herramienta efímera como producción.
3. **La solución no es más servidores, es reproducibilidad.** Fase 0 cuesta $0 y es lo que habría evitado las tres pérdidas.
4. **Hygieia se redespliega como L1 anclada a Fuji**, manteniendo `chainId 21668`, token `HVE` y control total de fees.
5. **Con $100 se logra una PoC persistente de 1 validador** (~2.6 meses de runway), no producción.
6. **Riesgo heredado:** el deployer era la clave pública `ewoq`. Debe reemplazarse antes de cualquier despliegue persistente.
7. **Datos médicos** siguen cifrados off-chain (IPFS + ECDH). La chain solo guarda hashes, permisos y eventos.
8. **Avascan es prioridad baja.** Blockscout propio resuelve la demostrabilidad hoy.
