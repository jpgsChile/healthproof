import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const SCRYPT_ITERATIONS = 16384;

export interface EncryptedPayload {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  salt?: Buffer;
}

/**
 * Deriva clave de 32 bytes desde passphrase usando scrypt
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LENGTH, { N: SCRYPT_ITERATIONS });
}

/**
 * Encripta con AES-256-GCM
 * @param plaintext - Texto a encriptar
 * @param key - Clave de 32 bytes (Buffer) o passphrase (string)
 * @returns Payload encriptado con iv, authTag y opcionalmente salt
 */
export function encrypt(plaintext: string, key: Buffer | string): EncryptedPayload {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey =
    typeof key === 'string' ? deriveKey(key, salt) : validateKey(key);

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return typeof key === 'string'
    ? { encrypted, iv, authTag, salt }
    : { encrypted, iv, authTag };
}

/**
 * Desencripta payload AES-256-GCM
 */
export function decrypt(
  encrypted: Buffer,
  iv: Buffer,
  authTag: Buffer,
  key: Buffer | string,
  salt?: Buffer,
): string {
  let derivedKey: Buffer;
  if (typeof key === 'string') {
    if (!salt) throw new Error('Salt required for passphrase decryption');
    derivedKey = deriveKey(key, salt);
  } else {
    derivedKey = validateKey(Buffer.isBuffer(key) ? key : Buffer.from(key as ArrayBuffer));
  }

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Serializa payload para almacenamiento
 * Formato: version(1) + [salt(32) si v2] + iv(16) + authTag(16) + encrypted
 */
export function serialize(payload: EncryptedPayload): Buffer {
  const hasSalt = !!payload.salt;
  const version = hasSalt ? 2 : 1;
  const parts: Buffer[] = [Buffer.from([version])];
  if (hasSalt) parts.push(payload.salt!);
  parts.push(payload.iv, payload.authTag, payload.encrypted);
  return Buffer.concat(parts);
}

/**
 * Deserializa payload desde almacenamiento
 */
export function deserialize(data: Buffer): EncryptedPayload & { salt?: Buffer } {
  const version = data[0];
  let offset = 1;

  const salt = version === 2 ? data.subarray(offset, offset + SALT_LENGTH) : undefined;
  if (version === 2) offset += SALT_LENGTH;

  const iv = data.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = data.subarray(offset, offset + TAG_LENGTH);
  offset += TAG_LENGTH;
  const encrypted = data.subarray(offset);

  return { encrypted, iv, authTag, salt };
}

/**
 * Encripta y serializa en un solo paso
 */
export function encryptAndSerialize(plaintext: string, key: Buffer | string): Buffer {
  return serialize(encrypt(plaintext, key));
}

/**
 * Deserializa y desencripta en un solo paso
 */
export function deserializeAndDecrypt(data: Buffer, key: Buffer | string): string {
  const payload = deserialize(data);
  return decrypt(
    payload.encrypted,
    payload.iv,
    payload.authTag,
    key,
    payload.salt,
  );
}

function validateKey(key: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`);
  }
  return key;
}
