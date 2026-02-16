# Avalanche Infrastructure

## fuji.config.json

Configuración para Fuji testnet (C-Chain):

- **chainId**: 43113
- **rpc**: URLs públicas
- **contracts**: Direcciones (sustituir con valores reales tras deploy)

Actualizar `contracts.documentRegistry` y `contracts.issuerRegistry` tras el deploy.

## subnet-config.json

Configuración para Subnet-EVM (futuro):

- **validatorOnly**: `false` = nodos no validadores pueden sincronizar
- **consensusParameters**: Snowman++ (k, alpha, beta, etc.)
- **proposerMinBlockDelay**: 1 segundo

Usar con `avalanche subnet deploy` o similar.
