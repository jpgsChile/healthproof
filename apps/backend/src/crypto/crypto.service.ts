import { Injectable } from '@nestjs/common';
import { createHash, createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

@Injectable()
export class CryptoService {
  /**
   * Calcula SHA-256 hash de un buffer (documento)
   */
  sha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Convierte hash hex a formato bytes32 para ethers
   */
  hexToBytes32(hexHash: string): `0x${string}` {
    const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
    return `0x${clean.padStart(64, '0')}` as `0x${string}`;
  }

  /**
   * Encripta metadata con AES-256-GCM
   * @param plaintext Metadata en JSON string
   * @param key Encryption key (32 bytes) o passphrase
   * @returns { encrypted, iv, authTag, salt } - componentes para almacenar
   */
  encryptAes256(
    plaintext: string,
    key: Buffer | string,
  ): { encrypted: Buffer; iv: Buffer; authTag: Buffer; salt?: Buffer } {
    const salt = randomBytes(SALT_LENGTH);
    const derivedKey =
      typeof key === 'string'
        ? scryptSync(key, salt, KEY_LENGTH)
        : Buffer.isBuffer(key)
          ? key
          : Buffer.from(key);

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return typeof key === 'string' ? { encrypted, iv, authTag, salt } : { encrypted, iv, authTag };
  }

  /**
   * Desencripta metadata
   */
  decryptAes256(
    encrypted: Buffer,
    iv: Buffer,
    authTag: Buffer,
    key: Buffer | string,
    salt?: Buffer,
  ): string {
    const derivedKey =
      typeof key === 'string' && salt
        ? scryptSync(key, salt, KEY_LENGTH)
        : Buffer.isBuffer(key)
          ? key
          : Buffer.from(key);

    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /**
   * Serializa payload encriptado para almacenamiento
   * Formato: version(1) + [salt(32) si v2] + iv(16) + authTag(16) + encrypted
   */
  serializeEncrypted(payload: {
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
    salt?: Buffer;
  }): Buffer {
    const hasSalt = !!payload.salt;
    const version = hasSalt ? 2 : 1;
    const parts: Buffer[] = [Buffer.from([version])];
    if (hasSalt) parts.push(payload.salt!);
    parts.push(payload.iv, payload.authTag, payload.encrypted);
    return Buffer.concat(parts);
  }

  /**
   * Deserializa payload encriptado
   */
  deserializeEncrypted(data: Buffer): {
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
    salt?: Buffer;
  } {
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
}
