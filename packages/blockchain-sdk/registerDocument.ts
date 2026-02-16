import { zeroPadValue } from 'ethers';
import type { Contract } from 'ethers';

export interface RegisterDocumentParams {
  documentHash: string;
  metadataHash: string;
  issuerAddress: string;
}

export interface RegisterDocumentResult {
  txHash: string;
  success: boolean;
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
 * Registra documento en DocumentRegistry
 * Requiere contract con signer (backend o wallet conectada)
 */
export async function registerDocument(
  contract: Contract,
  params: RegisterDocumentParams,
): Promise<RegisterDocumentResult> {
  const documentHash = hexToBytes32(params.documentHash);
  const metadataHash = hexToBytes32(params.metadataHash);

  const tx = await contract.registerDocument(
    documentHash,
    params.issuerAddress,
    metadataHash,
  );

  const receipt = await tx.wait();
  const txHash = receipt?.hash ?? tx.hash;

  return {
    txHash: typeof txHash === 'string' ? txHash : '',
    success: true,
  };
}
