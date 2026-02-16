# @healthproof/blockchain-sdk

Abstracción para backend + frontend. DocumentRegistry en Avalanche.

## Estructura

```
packages/blockchain-sdk/
├── provider.ts       # createNodeProvider, createReadOnlyProvider, connectBrowserProvider
├── registerDocument.ts
├── verifyDocument.ts
└── index.ts
```

## Backend (Node)

```typescript
import { createNodeProvider, registerDocument, verifyDocument } from '@healthproof/blockchain-sdk';

const { contract } = createNodeProvider({
  rpcUrl: process.env.AVALANCHE_RPC_URL!,
  contractAddress: process.env.DOCUMENT_REGISTRY_ADDRESS!,
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY!,
});

const result = await registerDocument(contract, {
  documentHash: 'a1b2...',
  metadataHash: 'c3d4...',
  issuerAddress: '0x...',
});

const verified = await verifyDocument(contract, 'a1b2...');
```

## Frontend (read-only)

```typescript
import { createReadOnlyProvider, verifyDocument } from '@healthproof/blockchain-sdk';

const { contract } = createReadOnlyProvider({
  rpcUrl: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL!,
  contractAddress: process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_ADDRESS!,
});

const { exists, issuer, timestamp } = await verifyDocument(contract, documentHash);
```

## Frontend (con wallet)

```typescript
import { connectBrowserProvider, registerDocument } from '@healthproof/blockchain-sdk';

const { contract } = await connectBrowserProvider(
  { contractAddress: process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_ADDRESS! },
  window.ethereum
);

await registerDocument(contract, { documentHash, metadataHash, issuerAddress });
```
