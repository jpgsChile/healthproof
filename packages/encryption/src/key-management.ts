import { randomBytes } from 'crypto';

const KEY_LENGTH = 32;

/**
 * Genera una clave AES-256 aleatoria (32 bytes)
 */
export function generateKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Genera clave y la retorna en hex (64 caracteres)
 */
export function generateKeyHex(): string {
  return generateKey().toString('hex');
}

/**
 * Valida que un string sea una clave hex válida (64 chars)
 */
export function isValidHexKey(hex: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

/**
 * Convierte clave hex a Buffer
 * @throws Si el formato no es válido
 */
export function hexKeyToBuffer(hex: string): Buffer {
  if (!isValidHexKey(hex)) {
    throw new Error('Key must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Parsea clave desde variable de entorno
 * Acepta: 64 hex chars (clave directa) o passphrase
 */
export function parseKeyFromEnv(envValue: string | undefined): Buffer | string {
  if (!envValue || envValue.length === 0) {
    throw new Error('Encryption key is required');
  }
  const trimmed = envValue.trim();
  if (isValidHexKey(trimmed)) {
    return hexKeyToBuffer(trimmed);
  }
  return trimmed;
}
