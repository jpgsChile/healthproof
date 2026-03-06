# Infraestructura Avalanche — HealthProof

Infraestructura blockchain del protocolo **HealthProof** sobre Avalanche C-Chain y Subnet-EVM. Incluye contratos inteligentes modulares, configuración de red y scripts de deployment.

---

## Índice

- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Contratos](#contratos)
- [Configuración de red](#configuración-de-red)
- [Deployment](#deployment)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Quick Start](#quick-start)

---

## Arquitectura

El protocolo utiliza un **patrón Kernel** modular:

```
                    ┌─────────────────────┐
                    │  HealthProofGateway │  ← Punto de entrada (usuarios/dApps)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  HealthProofKernel  │  ← Registro de módulos, pause, governance
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    EPISODE_MODULE       ORDER_MODULE         DOCUMENT_MODULE    PERMISSION_MODULE
         │                     │                     │                     │
         ▼                     ▼                     ▼                     ▼
 ClinicalEpisodeRegistry  MedicalOrderRegistry  MedicalDocumentRegistry  PermissionManager
```

- **HealthProofGateway**: Punto de entrada único. Enruta llamadas a los módulos registrados en el Kernel.
- **HealthProofKernel**: Administra módulos, pausa del protocolo y roles (admin, governance, guardian).
- **HealthProofProtocol**: Orquestador alternativo que coordina permisos, documentos y auditoría.

---

## Estructura del proyecto

```
infra/avalanche/
├── README.md                 # Este archivo
├── network/                  # Configuración L1 y Subnet
│   ├── fuji.config.json     # Fuji testnet (chainId 43113)
│   └── subnet-config.json   # Subnet-EVM (consensus, proposer)
│
└── contracts/               # Smart contracts del protocolo
    ├── src/
    │   ├── core/            # Núcleo del protocolo
    │   │   ├── HealthProofKernel.sol
    │   │   ├── HealthProofGateway.sol
    │   │   └── HealthProofProtocol.sol
    │   ├── identity/        # Identidad y tutores
    │   │   ├── IdentityRegistry.sol
    │   │   └── GuardianRegistry.sol
    │   ├── access/          # Permisos
    │   │   └── PermissionManager.sol
    │   ├── clinical/        # Datos clínicos
    │   │   ├── ClinicalEpisodeRegistry.sol
    │   │   ├── MedicalOrderRegistry.sol
    │   │   └── MedicalDocumentRegistry.sol
    │   ├── network/         # Red de salud
    │   │   └── HealthcareNetworkRegistry.sol
    │   ├── audit/           # Auditoría
    │   │   └── AuditTrail.sol
    │   └── interfaces/     # Interfaces compartidas
    │       ├── IIdentityRegistry.sol
    │       ├── IPermissionManager.sol
    │       ├── IMedicalDocumentRegistry.sol
    │       └── IAuditTrail.sol
    ├── deploy/              # Script de deployment legacy
    │   └── deploy.ts
    ├── scripts/             # Scripts de deployment production-grade
    │   └── deployHealthProof.ts
    ├── test/                # Tests (Hardhat)
    ├── hardhat.config.ts
    └── package.json
```

---

## Contratos

| Contrato | Descripción | Dependencias |
|----------|-------------|--------------|
| **IdentityRegistry** | Registro de entidades (pacientes, médicos, instituciones) y verificación | — |
| **GuardianRegistry** | Gestión de tutores legales | IdentityRegistry |
| **PermissionManager** | Permisos de acceso a recursos médicos | IdentityRegistry, GuardianRegistry |
| **ClinicalEpisodeRegistry** | Episodios clínicos | IdentityRegistry |
| **MedicalOrderRegistry** | Órdenes médicas (laboratorio, estudios) | IdentityRegistry |
| **MedicalDocumentRegistry** | Documentos médicos y metadatos | IdentityRegistry |
| **HealthcareNetworkRegistry** | Red de instituciones de salud | — |
| **AuditTrail** | Trazabilidad y auditoría de eventos | — |
| **HealthProofKernel** | Núcleo: módulos, pause, governance | admin, governance, guardian |
| **HealthProofGateway** | Punto de entrada al protocolo | HealthProofKernel |
| **HealthProofProtocol** | Orquestador de permisos, documentos y auditoría | PermissionManager, MedicalDocumentRegistry, AuditTrail |

### Módulos del Kernel

| Module ID | Contrato |
|-----------|----------|
| `EPISODE_MODULE` | ClinicalEpisodeRegistry |
| `ORDER_MODULE` | MedicalOrderRegistry |
| `DOCUMENT_MODULE` | MedicalDocumentRegistry |
| `PERMISSION_MODULE` | PermissionManager |

---

## Configuración de red

### `network/fuji.config.json`

Configuración para **Avalanche Fuji Testnet** (chainId 43113):

- **RPC**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Explorer**: [testnet.snowtrace.io](https://testnet.snowtrace.io)
- **RPC alternativos**: PublicNode, Ankr

### `network/subnet-config.json`

Configuración para **Subnet-EVM**:

- Parámetros de consenso (k, alpha, beta, etc.)
- Parámetros del proposer
- `validatorOnly: false` — permite nodos no validadores

---

## Deployment

### Prerrequisitos

- Node.js 18+
- Cuenta con AVAX en Fuji (para testnet)
- Clave privada del deployer

### Variables de entorno

Crea un archivo `.env` en `contracts/`:

```env
PRIVATE_KEY=0x...          # Clave privada del deployer (sin 0x opcional)
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc   # Opcional, hay valor por defecto
```

### Opciones de deployment

| Script | Red | Descripción |
|--------|-----|-------------|
| `deploy:healthproof` | Hardhat (in-memory) | Deployment local para pruebas |
| `deploy:healthproof:fuji` | Avalanche Fuji | Deployment en testnet |
| `deploy:healthproof:local` | localhost:8545 | Nodo Hardhat local |
| `deploy` / `deploy:fuji` | Legacy | Script `deploy/deploy.ts` |

### Orden de deployment (automático)

1. IdentityRegistry, GuardianRegistry, PermissionManager  
2. ClinicalEpisodeRegistry, MedicalOrderRegistry, MedicalDocumentRegistry  
3. HealthcareNetworkRegistry, AuditTrail  
4. HealthProofKernel  
5. HealthProofProtocol, HealthProofGateway  
6. Registro de módulos en el Kernel  
7. Bootstrap: deployer como ADMIN en IdentityRegistry  

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PRIVATE_KEY` | Sí (Fuji/local) | Clave privada del deployer |
| `AVALANCHE_RPC_URL` | No | RPC de Avalanche (default: Fuji) |

---

## Scripts disponibles

```bash
cd infra/avalanche/contracts
```

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compila contratos (Hardhat) |
| `npm run test` | Ejecuta tests |
| `npm run clean` | Limpia cache y artifacts |
| `npm run deploy:healthproof` | Deployment completo (Hardhat) |
| `npm run deploy:healthproof:fuji` | Deployment en Fuji testnet |
| `npm run deploy:healthproof:local` | Deployment en localhost |
| `npm run deploy` | Deployment legacy (Hardhat) |
| `npm run deploy:fuji` | Deployment legacy (Fuji) |
| `npm run deploy:local` | Deployment legacy (localhost) |

---

## Quick Start

```bash
# 1. Instalar dependencias
cd infra/avalanche/contracts
npm install

# 2. Compilar
npm run build

# 3. Deployment local (Hardhat in-memory)
npm run deploy:healthproof

# 4. Deployment en Fuji (requiere PRIVATE_KEY y AVAX)
# Crear .env con PRIVATE_KEY=0x...
npm run deploy:healthproof:fuji
```

### Obtener AVAX en Fuji

1. [Fuji Faucet](https://faucet.avax.network/)
2. O conectar wallet en [testnet.snowtrace.io](https://testnet.snowtrace.io)

---

## Stack técnico

- **Solidity** ^0.8.20
- **Hardhat** ^2.19
- **ethers.js** v6
- **TypeScript** ^5.3
- **Avalanche C-Chain** / Fuji Testnet (chainId 43113)

---

## Referencias

- [Avalanche Docs](https://docs.avax.network/)
- [Fuji Testnet](https://docs.avax.network/quickstart/fuji-workflow)
- [Subnet-EVM](https://docs.avax.network/subnets/evm-chain)
- [Snowtrace (Explorer)](https://snowtrace.io/)
