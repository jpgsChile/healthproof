import { verifyMessage } from 'ethers';
import type { VerifiableCredential } from './types';
import { didToAddress } from './createDid';

/**
 * Verifica un Verifiable Credential
 * - Valida estructura
 * - Verifica firma EIP-191
 * - Comprueba expiración
 */
export function verifyCredential(
  credential: VerifiableCredential,
): { valid: boolean; error?: string } {
  try {
    // 1. Estructura mínima
    if (!credential['@context'] || !credential.issuer || !credential.credentialSubject) {
      return { valid: false, error: 'Invalid credential structure' };
    }

    // 2. Proof requerido
    if (!credential.proof?.proofValue) {
      return { valid: false, error: 'Missing proof' };
    }

    // 3. Expiración
    if (credential.expirationDate) {
      const exp = new Date(credential.expirationDate).getTime();
      if (Date.now() > exp) {
        return { valid: false, error: 'Credential expired' };
      }
    }

    // 4. Reconstruir payload canónico para verificación
    const { proof, ...credentialWithoutProof } = credential;
    const payload = canonicalize(credentialWithoutProof);

    // 5. Extraer issuer address del DID
    const issuerId = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;
    const expectedAddress = didToAddress(issuerId);

    // 6. Verificar firma (ethers recoverAddress de personal_sign)
    const recoveredAddress = verifyMessage(payload, proof!.proofValue!);

    if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Verification failed',
    };
  }
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.keys(obj as object)
    .sort()
    .reduce((acc, k) => {
      (acc as Record<string, unknown>)[k] = sortKeys((obj as Record<string, unknown>)[k]);
      return acc;
    }, {} as Record<string, unknown>);
}

function canonicalize(credential: Omit<VerifiableCredential, 'proof'>): string {
  return JSON.stringify(sortKeys(credential));
}
