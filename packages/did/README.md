# @healthproof/did

DID y Verifiable Credentials - base VC-grade para Avalanche.

## Estructura

```
packages/did/
├── createDid.ts        # DID did:ethr
├── issueCredential.ts   # Emisión de VC
├── verifyCredential.ts  # Verificación de VC
├── types.ts
└── index.ts
```

## Uso

```typescript
import {
  createDidFromPrivateKey,
  issueCredential,
  verifyCredential,
} from '@healthproof/did';
import { Wallet } from 'ethers';

const issuer = new Wallet(process.env.PRIVATE_KEY!);

// DID del emisor
const did = createDidFromPrivateKey(process.env.PRIVATE_KEY!, 43113);

// Emitir credential
const vc = await issueCredential(
  issuer,
  'did:ethr:0x1234...',
  { documentHash: '0xabc...', documentType: 'lab_result' },
  { expirationDate: '2025-12-31T23:59:59Z' }
);

// Verificar
const { valid, error } = verifyCredential(vc);
```

## Futuro VC-grade

- did:key, did:web
- JSON-LD / RDF canonicalization
- Linked Data Proofs (Ed25519Signature2020, EcdsaSecp256k1Signature2019)
- Presentation Exchange
