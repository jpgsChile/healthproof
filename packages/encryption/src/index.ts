/**
 * @healthproof/encryption
 * Módulo crítico de encriptación para HealthProof
 */

export {
  generateSymmetricKey,
  encryptWithAES256,
  decryptWithAES256,
  sha256Hash,
} from './core';

export {
  sha256,
  sha512,
  hash,
  hexToBytes32,
  type HashAlgorithm,
} from './hash';

export {
  encrypt,
  decrypt,
  serialize,
  deserialize,
  encryptAndSerialize,
  deserializeAndDecrypt,
  type EncryptedPayload,
} from './aes';

export {
  generateKey,
  generateKeyHex,
  isValidHexKey,
  hexKeyToBuffer,
  parseKeyFromEnv,
} from './key-management';
