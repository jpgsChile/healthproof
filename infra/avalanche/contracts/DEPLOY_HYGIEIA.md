# Guia: Desplegar HealthProof en Hygieia (L1)

Pasos para desplegar los contratos del protocolo HealthProof en tu red **Hygieia**.

## Datos de red

- **Network name**: `Hygieia`
- **RPC URL**: `http://18.223.252.59:9650/ext/bc/kZYSkYiknAeZJbwtz4M6tN9YmbriGiLQwLKR4Pr7S2UEXQQuW/rpc`
- **Chain ID**: `21668`
- **Currency**: `HVE`

## Paso 1: Preparar `.env`

En `infra/avalanche/contracts` crea un archivo `.env`:

```env
PRIVATE_KEY=0xTU_CLAVE_PRIVADA
HYGIEIA_RPC_URL=http://18.223.252.59:9650/ext/bc/kZYSkYiknAeZJbwtz4M6tN9YmbriGiLQwLKR4Pr7S2UEXQQuW/rpc
```

`HYGIEIA_RPC_URL` es opcional porque ya hay fallback en `hardhat.config.ts`, pero se recomienda dejarlo explícito.

## Paso 2: Compilar

```bash
cd infra/avalanche/contracts
npm install
npm run build
```

## Paso 3: Desplegar

```bash
npm run deploy:healthproof:hygieia
```

Comando equivalente:

```bash
npx hardhat run scripts/deployHealthProof.ts --network hygieia
```

## Paso 4: Validar salida

Debes ver:

- Dirección del deployer
- Red `hygieia`
- Direcciones de todos los contratos
- Registro de módulos del kernel
- `HealthProof Deployment Summary`

## Solución de problemas

| Error | Acción |
|---|---|
| `No deployer account found` | Verifica que `PRIVATE_KEY` exista en `.env` |
| `insufficient funds` | Fondea la wallet con `HVE` |
| `could not detect network` | Revisa `HYGIEIA_RPC_URL` y conectividad |
| `network hygieia not found` | Confirma que `hardhat.config.ts` tenga `networks.hygieia` |

