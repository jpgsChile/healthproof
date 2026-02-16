import { zeroPadValue } from 'ethers';
import type { Contract } from 'ethers';

export interface VerifyDocumentResult {
  exists: boolean;
  issuer: string;
  timestamp: bigint;
}

/**
 * Convierte hash hex a bytes32
 */
function hexToBytes32(hex: string): `0x${string}` {
  const clean = hex.trim().replace(/^0x/, '');
  if (clean.length !== 64 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error('Hash must be 64 hex characters (SHA-256)');
  }
  return zeroPadValue(`0x${clean}`, 32) as `0x${string}`;
}

/**
 * Verifica documento en DocumentRegistry
 * Funciona con contract read-only (sin signer)
 */
export async function verifyDocument(
  contract: Contract,
  documentHashHex: string,
): Promise<VerifyDocumentResult> {
  const documentHash = hexToBytes32(documentHashHex);
  const [exists, issuer, timestamp] = await contract.verifyDocument(documentHash);
  return {
    exists: Boolean(exists),
    issuer: String(issuer),
    timestamp: BigInt(timestamp),
  };
}
