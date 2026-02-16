# @healthproof/encryption

Módulo de encriptación seguro y listo para producción.

## API Principal

```typescript
import {
  generateSymmetricKey,
  encryptWithAES256,
  decryptWithAES256,
  sha256Hash,
} from '@healthproof/encryption';

// Generar clave de 32 bytes
const key = generateSymmetricKey();

// Hash de archivo (SHA-256)
const hash = sha256Hash(fileBuffer);

// Encriptar
const ciphertext = encryptWithAES256(data, key);

// Desencriptar
const plaintext = decryptWithAES256(ciphertext, key);
```

## Seguridad

- **AES-256-GCM**: Encriptación autenticada (AEAD)
- **IV aleatorio**: 96 bits por operación
- **CSPRNG**: `crypto.randomBytes` para claves e IVs
- **Validación de clave**: 32 bytes requeridos
- **Sin dependencias externas**: Solo Node.js `crypto`

## Formato ciphertext

`iv(12) + authTag(16) + encrypted`
