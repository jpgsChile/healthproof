import { createHash } from 'crypto';

/**
 * Algoritmos de hash soportados
 */
export type HashAlgorithm = 'sha256' | 'sha512';

/**
 * Calcula SHA-256 de un buffer o string
 * @returns Hash en formato hex (64 caracteres)
 */
export function sha256(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calcula SHA-512 de un buffer o string
 * @returns Hash en formato hex (128 caracteres)
 */
export function sha512(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return createHash('sha512').update(buffer).digest('hex');
}

/**
 * Hash genérico por algoritmo
 */
export function hash(input: Buffer | string, algorithm: HashAlgorithm = 'sha256'): string {
  return algorithm === 'sha512' ? sha512(input) : sha256(input);
}

/**
 * Convierte hash hex a formato bytes32 para smart contracts (ethers)
 */
export function hexToBytes32(hexHash: string): `0x${string}` {
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  if (clean.length !== 64) {
    throw new Error('SHA-256 hash must be 64 hex characters');
  }
  return `0x${clean}` as `0x${string}`;
}
