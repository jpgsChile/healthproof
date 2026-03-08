# Decisión: Solidity 0.8.20

## Contexto

El proyecto tenía **pragmas mezclados**: 8 archivos con `^0.8.20` y 7 con `^0.8.24`, lo que provocaba errores de compilación (HH606).

## Opciones analizadas

| Opción | Acción | Pros | Contras |
|--------|--------|------|---------|
| A | Hardhat → 0.8.24, mantener pragmas | Compila todo | Menos tiempo en producción, features Cancun no usadas |
| B | Unificar todo a 0.8.20 | **Elegida** | Más estable, pragmas consistentes | Ninguno relevante |

## Justificación técnica

### 1. Estabilidad en producción

- **0.8.20** (mayo 2023): ~20 meses en producción, ampliamente usado.
- **0.8.24** (enero 2024): ~12 meses, menos tiempo validado en mainnets.

Para protocolos de salud, priorizar **estabilidad** sobre novedades.

### 2. Compatibilidad con Avalanche C-Chain

- C-Chain usa EVM compatible con Shanghai (0.8.20).
- 0.8.24 introduce soporte Cancun (EIP-1153, EIP-4844, etc.).
- HealthProof **no usa** transient storage, blobs ni MCOPY.
- Las mejoras de 0.8.24 no aportan beneficio directo a este código.

### 3. Consistencia del codebase

- Un solo pragma en todo el proyecto reduce errores y facilita mantenimiento.
- Evita compilaciones con versiones distintas según archivo.

### 4. Reproducibilidad

- Versión fija en Hardhat + pragmas unificados = builds reproducibles.
- Facilita auditorías y despliegues en distintos entornos.

## Cambios realizados

- `hardhat.config.ts`: `version: "0.8.20"`
- 7 archivos: `^0.8.24` → `^0.8.20`:
  - GuardianRegistry.sol
  - HealthProofProtocol.sol
  - AuditTrail.sol
  - IIdentityRegistry.sol
  - IAuditTrail.sol
  - IMedicalDocumentRegistry.sol
  - IPermissionManager.sol

## Cuándo considerar 0.8.24+

- Si se necesitan features Cancun (transient storage, blobs).
- Si Avalanche habilita Cancun como default.
- Tras un periodo de adopción mayor de 0.8.24 en producción.
