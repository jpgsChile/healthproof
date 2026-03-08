# Guía de Tests — HealthProof Contracts

Guía paso a paso para ejecutar los tests del protocolo HealthProof en entorno de desarrollo.

---

## Requisitos previos

- **Node.js** 18 o superior
- **npm** (incluido con Node.js)

---

## Paso 1: Instalar dependencias

```bash
cd infra/avalanche/contracts
npm install
```

---

## Paso 2: Compilar contratos

```bash
npm run build
```

Verifica que la compilación termine sin errores. Los artefactos se generan en `artifacts/`.

---

## Paso 3: Ejecutar todos los tests

```bash
npm run test
```

O directamente con Hardhat:

```bash
npx hardhat test
```

**Salida esperada:** `28 passing`

---

## Paso 4: Ejecutar tests por archivo

Para ejecutar solo un conjunto de tests:

```bash
# Solo IdentityRegistry
npx hardhat test test/IdentityRegistry.test.ts

# Solo GuardianRegistry
npx hardhat test test/GuardianRegistry.test.ts

# Solo HealthProofKernel
npx hardhat test test/HealthProofKernel.test.ts

# Solo HealthProofGateway
npx hardhat test test/HealthProofGateway.test.ts
```

---

## Paso 5: Ejecutar un test específico

Usa el flag `--grep` para filtrar por nombre:

```bash
npx hardhat test --grep "Debe asignar admin"
npx hardhat test --grep "createEpisode"
npx hardhat test --grep "grantGuardianship"
```

---

## Paso 6: Tests con reporte detallado

Para ver gas usado y más detalle:

```bash
npx hardhat test --verbose
```

---

## Estructura de tests

| Archivo | Contratos probados | Tests |
|---------|--------------------|-------|
| `IdentityRegistry.test.ts` | IdentityRegistry | Deployment, registerEntity, verifyEntity, getRole |
| `GuardianRegistry.test.ts` | GuardianRegistry | grantGuardianship, isGuardian |
| `HealthProofKernel.test.ts` | HealthProofKernel | registerModule, pauseProtocol, resumeProtocol, upgradeModule |
| `HealthProofGateway.test.ts` | Gateway + módulos | createEpisode, createMedicalOrder, registerMedicalDocument, grantAccess |

---

## Fixture compartido

El archivo `test/fixtures.ts` despliega todos los contratos y configura:

- IdentityRegistry, GuardianRegistry, PermissionManager
- ClinicalEpisodeRegistry, MedicalOrderRegistry, MedicalDocumentRegistry
- HealthcareNetworkRegistry, AuditTrail
- HealthProofKernel, HealthProofGateway, HealthProofProtocol
- Registro de módulos en el Kernel
- Entidades: deployer (ADMIN), doctor, patient, certifier
- Gateway registrado como DOCTOR verificado (para flujos vía Gateway)

---

## Solución de problemas

### Error: "Cannot find module"
```bash
npm install
npm run build
```

### Tests lentos
La primera ejecución compila los contratos. Las siguientes son más rápidas (~3–5 s).

### Limpiar y recompilar
```bash
npm run clean
npm run build
npm run test
```

---

## Resumen de comandos

| Comando | Descripción |
|---------|-------------|
| `npm run test` | Ejecutar todos los tests |
| `npx hardhat test test/X.test.ts` | Ejecutar tests de un archivo |
| `npx hardhat test --grep "nombre"` | Ejecutar tests que coincidan |
| `npx hardhat test --verbose` | Reporte detallado |
