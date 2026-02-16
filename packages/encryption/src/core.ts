import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16;

/**
 * Genera una clave simétrica AES-256 (32 bytes) usando CSPRNG
 */
export function generateSymmetricKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Encripta datos con AES-256-GCM
 * @param data - Buffer o string a encriptar
 * @param key - Clave de 32 bytes (Buffer)
 * @returns Buffer serializado: iv(12) + authTag(16) + ciphertext
 */
export function encryptWithAES256(data: Buffer | string, key: Buffer): Buffer {
  validateKey(key);

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Desencripta datos con AES-256-GCM
 * @param ciphertext - Buffer serializado (iv + authTag + encrypted)
 * @param key - Clave de 32 bytes (Buffer)
 * @returns Buffer con datos en claro
 */
export function decryptWithAES256(ciphertext: Buffer, key: Buffer): Buffer {
  validateKey(key);

  if (ciphertext.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short');
  }

  const iv = ciphertext.subarray(0, IV_LENGTH);
  const authTag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = ciphertext.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}

/**
 * Calcula SHA-256 de un buffer (ej. archivo)
 * @param fileBuffer - Buffer del archivo
 * @returns Hash en hex (64 caracteres)
 */
export function sha256Hash(fileBuffer: Buffer): string {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('Input must be a Buffer');
  }
  return createHash('sha256').update(fileBuffer).digest('hex');
}

function validateKey(key: Buffer): void {
  if (!Buffer.isBuffer(key)) {
    throw new Error('Key must be a Buffer');
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (256 bits)`);
  }
}
