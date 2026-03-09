# HealthProof — Architecture Debt & Known Issues (v1.1 → v1.2)

> Documento de referencia para planificar las mejoras post-MVP.
> Cada sección incluye: problema, impacto, causa raíz y solución propuesta.

---

## 1. CRITICAL — Deployer como God Key

### 1.1 Single Private Key controla todo

**Problema:** Una sola `DEPLOYER_PRIVATE_KEY` en el servidor Next.js ejecuta TODAS las transacciones on-chain: registrar identidades, verificar entidades, registrar documentos, otorgar/revocar permisos, crear órdenes, abrir episodios.

**Impacto:**
- Si se compromete la key, el atacante tiene control total del protocolo
- No hay separación de responsabilidades (admin, certifier, guardian son la misma key)
- No hay audit trail real de quién solicitó cada operación — todo aparece como "deployer"

**Causa raíz:** MVP usa server actions con deployer key como proxy para todos los roles porque las embedded wallets de Privy no tienen AVAX para gas.

**Solución v1.2:**
- Implementar **meta-transactions (EIP-2771)** con un Trusted Forwarder
- Cada usuario firma off-chain con su embedded wallet, el relayer (deployer) paga gas
- Los contratos usan `_msgSender()` → identidad real del usuario queda on-chain
- Separar keys: admin key, relayer key, certifier key en distintos KMS

---

### 1.2 Deployer es guardian de TODOS los pacientes

**Problema:** `useRegisterIdentity` registra automáticamente al deployer como `VOLUNTARY_DELEGATION` guardian de cada paciente nuevo. Esto permite que el deployer ejecute `grantPermission` y `revokePermission` en nombre de cualquier paciente.

**Impacto:**
- El deployer puede otorgar/revocar permisos sin consentimiento real del paciente
- Viola el principio de soberanía del dato que HealthProof promueve
- Un paciente no puede revocar la guardianía del deployer (no hay `revokeGuardianship` en el contrato)

**Causa raíz:** `PermissionManager.authorized` requiere `msg.sender == patient || isGuardian(patient, msg.sender)`. Sin meta-tx, el paciente no puede firmar directamente.

**Solución v1.2:**
- Meta-transactions: el paciente firma el grant/revoke, el relayer ejecuta
- Agregar `revokeGuardianship` al `GuardianRegistry` para que pacientes puedan retirar guardianes
- Remover la guardianía automática del deployer; solo usar guardianía para menores/incapaces reales

---

## 2. HIGH — Gateway como Doctor Fantasma

### 2.1 Orders y Episodes no tienen doctor real

**Problema:** `createMedicalOrder` y `openEpisode` se ejecutan via `HealthProofGateway`. Dentro de los registries, `msg.sender` = dirección del Gateway contract, no el doctor real.

**Impacto:**
- `order.doctor` = Gateway address → no hay trazabilidad del doctor que emitió la orden
- `episode.openedBy` = Gateway address → misma pérdida de trazabilidad
- En un dashboard, todas las órdenes aparecen como "creadas por 0xdA58…" (el Gateway)

**Causa raíz:** El Gateway delega al registry, y el registry usa `msg.sender` que es el Gateway.

**Solución v1.2:**
- Opción A (corto plazo): Agregar parámetro `doctor` explícito al Gateway y almacenarlo en la order/episode struct
- Opción B (correcto): Meta-transactions — el doctor firma, el relayer envía, `_msgSender()` = doctor real

### 2.2 assignLab, updateStatus, closeEpisode son inaccesibles

**Problema:** Estas funciones verifican `msg.sender == order.doctor` o `msg.sender == episode.openedBy`. Como el doctor es el Gateway, y nadie puede enviar txs "desde" un contrato, estas funciones son **inejecutables**.

**Impacto:**
- No se puede asignar un laboratorio a una orden
- No se puede actualizar el estado de una orden (SAMPLE_COLLECTED, RESULT_READY, etc.)
- No se puede cerrar un episodio clínico

**Causa raíz:** Los registries no exponen estas operaciones a través del Gateway, y el Gateway no tiene funciones proxy para ellas.

**Solución v1.2:**
- Agregar al Gateway: `assignLabViaGateway()`, `updateStatusViaGateway()`, `closeEpisodeViaGateway()`
- O mejor: rediseñar registries para aceptar un parámetro `onBehalfOf` verificado por el Gateway

---

## 3. HIGH — Contratos sin Upgradeability

### 3.1 Contratos no son upgradeable

**Problema:** Todos los contratos están deployados como contratos simples (no proxies). Si se encuentra un bug o se necesita agregar funcionalidad (ej: `revokeGuardianship`), hay que deployar un contrato nuevo y migrar estado.

**Impacto:**
- Cualquier fix requiere deploy nuevo + migración manual de data + actualizar todas las addresses
- El `HealthProofKernel.upgradeModule()` permite cambiar addresses de módulos, pero el estado (mappings) del módulo viejo se pierde

**Solución v1.2:**
- Usar patrón **UUPS Proxy** o **Transparent Proxy** para los registries
- Mantener el Kernel como router de módulos pero con proxies detrás

### 3.2 IdentityRegistry no tiene transferencia de admin

**Problema:** El admin del `IdentityRegistry` es `msg.sender` del constructor (deployer). No hay función `transferAdmin()` o multisig.

**Impacto:** Si la deployer key se pierde, nadie puede registrar/verificar nuevas entidades.

**Solución v1.2:**
- Agregar `transferAdmin(address newAdmin)` protegido por `onlyAdmin`
- Considerar OpenZeppelin `Ownable2Step` o un multisig

---

## 4. HIGH — Seguridad del Server-Side

### 4.1 Server actions sin autenticación

**Problema:** Las server actions de Next.js (`register-document-onchain.ts`, `grant-permission-onchain.ts`, etc.) no verifican quién las está llamando. Cualquier request al servidor puede ejecutarlas.

**Impacto:**
- Un actor malicioso podría llamar `grantPermissionOnChain` directamente pasando cualquier patientWallet/granteeWallet
- No hay rate limiting ni verificación de sesión Privy

**Causa raíz:** MVP priorizó velocidad de integración sobre autenticación en server actions.

**Solución v1.2:**
- Verificar token Privy en cada server action antes de ejecutar
- Validar que el `caller` (usuario autenticado) tiene permiso para la operación
- Agregar rate limiting por IP/session
- Mover lógica crítica al backend NestJS con middleware de auth

### 4.2 DEPLOYER_PRIVATE_KEY en el proceso Next.js

**Problema:** La private key está como env var en el proceso Next.js. Si hay un SSRF o leak de env vars, se expone.

**Solución v1.2:**
- Usar un **KMS** (AWS KMS, HashiCorp Vault) para firmar transacciones
- La key nunca sale del KMS; el servidor envía el unsigned tx y recibe la firma

---

## 5. MEDIUM — PermissionManager sin Paginación ni Indexación

### 5.1 Linear scan en hasAccess y revokePermission

**Problema:** `permissions[patient]` es un array que crece indefinidamente. `hasAccess()` y `revokePermission()` iteran todo el array con `for` loops.

**Impacto:**
- Gas cost crece linealmente con la cantidad de permisos históricos del paciente
- `revokePermission` podría fallar por gas limit si un paciente tiene muchos permisos
- `hasAccess` read calls se vuelven lentas

**Causa raíz:** Diseño simple de array sin cleanup ni mappings optimizados.

**Solución v1.2:**
- Cambiar a `mapping(address => mapping(address => Permission))` para O(1) lookups
- O usar un mapping con nesting: `patient → grantee → resourceId → Permission`
- Agregar función de cleanup para remover permisos expirados

### 5.2 No hay forma de listar permisos de un paciente

**Problema:** `permissions` mapping es `private` y no hay función `getPermissions(address patient)`. Solo se puede consultar `hasAccess()` uno por uno.

**Impacto:** El frontend no puede mostrar "permisos activos" de un paciente sin indexar eventos off-chain.

**Solución v1.2:**
- Exponer `getPermissions(address patient) returns (Permission[] memory)`
- O indexar eventos `PermissionGranted`/`PermissionRevoked` con un subgraph (The Graph)

---

## 6. MEDIUM — Frontend / Off-chain

### 6.1 No hay sincronización on-chain ↔ off-chain

**Problema:** Los datos on-chain (permisos, documentos, órdenes) y off-chain (document_secrets, permission_keys en Supabase) pueden diverger. Si una tx on-chain falla silenciosamente, el off-chain cree que el permiso existe pero on-chain no.

**Impacto:** Inconsistencia de estado — un doctor podría tener la key criptográfica (off-chain) pero no el permiso on-chain, o viceversa.

**Solución v1.2:**
- Implementar un **indexer** (subgraph o worker) que sincronice eventos on-chain → DB
- O verificar siempre on-chain antes de confiar en datos off-chain
- Agregar reconciliation jobs periódicos

### 6.2 features/audit usa API client inexistente

**Problema:** `features/audit/index.ts` importa `apiClient` y llama a `/audit/events` — este endpoint no existe en el backend NestJS ni como server action.

**Impacto:** La funcionalidad de audit trail está completamente rota.

**Solución v1.2:**
- Leer eventos del contrato `AuditTrail` directamente con `getLogs`/`getContractEvents`
- O implementar un subgraph que indexe todos los eventos de todos los contratos

### 6.3 Backend NestJS desactualizado

**Problema:** El backend en `apps/backend/` tiene ABIs viejos, modelos Prisma desactualizados (6 tablas cuando ahora son 3), y no se usa en el flujo actual (todo son server actions de Next.js).

**Impacto:** Código muerto que genera confusión. Si se quiere migrar a backend separado, requiere rewrite completo.

**Solución v1.2:**
- Decidir: ¿server actions de Next.js o backend NestJS?
- Si NestJS: actualizar Prisma schema, ABIs, y migrar server actions a controllers
- Si Next.js: eliminar o archivar el backend NestJS

### 6.4 Wallets no tienen AVAX

**Problema:** Las embedded wallets de Privy se crean vacías. Si en el futuro se quiere que los usuarios firmen txs directamente (Opción B para el tema del doctor), necesitan AVAX.

**Solución v1.2:**
- Implementar un **faucet** interno para testnet
- Para mainnet: meta-transactions (el relayer paga gas) o patrocinar gas via Paymaster (ERC-4337)

---

## 7. MEDIUM — Criptografía y Encryption

### 7.1 ECDH keys en IndexedDB

**Problema:** Las private keys ECDH del paciente se almacenan en IndexedDB como `non-extractable CryptoKey`. Si el usuario limpia el browser o cambia dispositivo, pierde acceso a todos sus documentos cifrados.

**Impacto:** Pérdida permanente de acceso a documentos médicos.

**Solución v1.2:**
- Key escrow cifrado (backup de la key cifrada con una passphrase del usuario)
- O integración con Privy's secure enclave para key recovery
- Multi-device sync via encrypted key backup en el servidor

### 7.2 encrypted_keys JSONB sin rotación

**Problema:** Los `encrypted_keys` en `document_secrets` se generan una vez. Si una key pública se compromete, no hay mecanismo de re-encryption masiva.

**Solución v1.2:**
- Implementar key rotation: generar nuevo keypair, re-wrap todos los AES keys con la nueva public key
- Agregar versioning a los encrypted_keys

---

## 8. LOW — UX y i18n

### 8.1 Admin panel no protegido por rol

**Problema:** El botón "Admin Panel" aparece para el rol `doctor` en el dashboard. Cualquier doctor puede intentar pausar el protocolo o registrar entidades (fallará on-chain pero el UI lo muestra).

**Solución v1.2:**
- Solo mostrar admin actions si el rol on-chain es ADMIN
- Proteger con `useOnChainRole` hook

### 8.2 Translation keys genéricas para actions reutilizadas

**Problema:** `manage-episodes` usa la key `verifyResults` y `admin-panel` usa `patientRecords` como labels — estos son los keys originales de las acciones que reemplazaron.

**Solución v1.2:**
- Crear translation keys dedicadas: `manageEpisodes`, `manageEpisodesDesc`, `adminPanel`, `adminPanelDesc`

### 8.3 Lab actions siguen deshabilitadas

**Problema:** Los action cards `pending-orders` y `results-history` del rol `lab` siguen con `disabled: true`.

**Solución v1.2:**
- Crear UI para que labs vean sus órdenes asignadas y historial de resultados
- Requiere poder indexar órdenes por lab (actualmente no hay función en el contrato para eso)

---

## 9. LOW — Contratos: Funcionalidad Faltante

### 9.1 No hay revokeGuardianship

**Problema:** `GuardianRegistry` permite `grantGuardianship` pero no revocarla. Una vez asignado, un guardián es permanente (salvo expiry).

### 9.2 No hay listOrders / listEpisodes

**Problema:** Los registries solo permiten consultar por ID específico (`getOrder(bytes32)`). No hay forma de obtener "todas las órdenes de un paciente" o "todos los episodios de un doctor".

**Solución:** Indexar eventos `MedicalOrderCreated` / `ClinicalEpisodeOpened` con un subgraph.

### 9.3 HealthProofGateway no tiene access control

**Problema:** Cualquier dirección verificada puede llamar `createMedicalOrder` vía Gateway. No valida que el caller sea doctor antes de delegarle al registry (el registry sí valida, pero al Gateway, no al caller original).

### 9.4 AuditTrail no se usa

**Problema:** El contrato `AuditTrail` está desplegado pero ningún otro contrato escribe en él. Los eventos se emiten por cada contrato individualmente.

**Solución:** Integrar `AuditTrail.log()` calls en el Gateway, o usar un subgraph que agregue eventos de todos los contratos.

---

## Prioridad de Resolución Sugerida para v1.2

| Prioridad | Issue | Esfuerzo |
|-----------|-------|----------|
| 🔴 P0 | 1.1 Meta-transactions (EIP-2771) | Alto — requiere modificar todos los contratos |
| 🔴 P0 | 4.1 Auth en server actions | Medio — verificar Privy token en cada action |
| 🔴 P0 | 2.2 Gateway proxy para assignLab/updateStatus/closeEpisode | Medio — nuevo deploy del Gateway |
| 🟠 P1 | 1.2 Remover guardianía automática del deployer | Bajo — condicionado a P0 |
| 🟠 P1 | 4.2 KMS para private keys | Medio — infra |
| 🟠 P1 | 3.1 Proxy upgradeability | Alto — redeploy con proxies |
| 🟡 P2 | 5.1 Optimizar PermissionManager storage | Medio — nuevo deploy |
| 🟡 P2 | 6.1 Indexer / subgraph | Medio — infra nueva |
| 🟡 P2 | 7.1 Key recovery | Medio — UX + crypto |
| 🟢 P3 | 6.3 Limpiar backend NestJS | Bajo |
| 🟢 P3 | 8.x UX fixes | Bajo |
| 🟢 P3 | 9.x Contract feature gaps | Variable |

---

*Generado: 2026-03-09 — HealthProof v1.1 (MVP)*
