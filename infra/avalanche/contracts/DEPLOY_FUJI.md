# Guía: Desplegar HealthProof en Fuji Testnet

Pasos para desplegar los contratos del protocolo HealthProof en **Avalanche Fuji** (chainId 43113).

---

## Paso 1: Obtener AVAX de prueba

Necesitas AVAX en Fuji para pagar el gas del deployment.

1. Abre el [Fuji Faucet](https://faucet.avax.network/)
2. Conecta tu wallet (MetaMask, etc.)
3. Selecciona **Fuji Testnet** y solicita AVAX
4. Espera a que lleguen los fondos (~1-5 AVAX suelen bastar)

**Alternativa:** [Core Wallet Faucet](https://core.app/tools/testnet-faucet/)

---

## Paso 2: Crear archivo `.env`

En la carpeta `contracts/`:

```bash
cd infra/avalanche/contracts
```

Crea el archivo `.env` (cópialo desde el ejemplo):

```bash
copy .env.example .env
```

O manualmente, crea `.env` con:

```env
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI
```

**Cómo obtener tu clave privada:**
- **MetaMask:** Cuenta → Detalles de la cuenta → Exportar clave privada
- **Core Wallet:** Configuración → Seguridad → Exportar clave privada

⚠️ **Nunca** compartas ni subas `.env` a git. Ya está en `.gitignore`.

---

## Paso 3: Verificar configuración

Comprueba que tu wallet tiene:
- Dirección correcta
- AVAX en Fuji (mínimo ~0.5 AVAX recomendado)

```bash
npm run build
```

Si compila bien, continúa.

---

## Paso 4: Ejecutar el deployment

```bash
npm run deploy:healthproof:fuji
```

O directamente:

```bash
npx hardhat run scripts/deployHealthProof.ts --network avalanche
```

---

## Paso 5: Revisar la salida

Deberías ver algo como:

```
--------------------------------------------------
HealthProof Protocol Deployment
Network: avalanche
--------------------------------------------------

Deployer: 0xTuDireccion...
Balance: X.XX AVAX

Starting deployment...

IdentityRegistry: 0x...
GuardianRegistry: 0x...
...
HealthProofGateway: 0x...
HealthProofProtocol: 0x...

Kernel modules registered.

--------------------------------------------------
HealthProof Deployment Summary
--------------------------------------------------
...
Deployment complete.
```

---

## Paso 6: Guardar las direcciones

Copia el **Deployment Summary** y guárdalo. Necesitarás estas direcciones para:
- Configurar el frontend
- Configurar el backend
- Verificar contratos en el explorer

**Explorer Fuji:** [subnets-test.avax.network/c-chain](https://subnets-test.avax.network/c-chain)

---

## Solución de problemas

| Error | Solución |
|-------|----------|
| `No deployer account found` | Verifica que `PRIVATE_KEY` está en `.env` |
| `Insufficient funds` | Obtén más AVAX del faucet |
| `network avalanche` no encontrada | El config usa `avalanche` para Fuji |
| `Invalid private key` | La clave debe ser hex (con o sin 0x) |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PRIVATE_KEY` | Sí | Clave privada del deployer |
| `AVALANCHE_RPC_URL` | No | RPC (default: Fuji público) |

---

## Después del deployment

Opcional: registrar el Gateway en IdentityRegistry para que los flujos vía Gateway funcionen. El deployer es admin del IdentityRegistry y puede:

1. Registrar el Gateway como entidad
2. Verificarlo
3. Asignarle rol DOCTOR (para createEpisode, createOrder, etc.)

Esto puede hacerse con un script post-deploy o manualmente vía ethers/Remix.
