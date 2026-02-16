import { Wallet, toUtf8Bytes } from 'ethers';
import type { VerifiableCredential, CredentialSubject } from './types';
import { createDidEthr } from './createDid';

const VC_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const VC_TYPE = 'VerifiableCredential';

/**
 * Emite un Verifiable Credential firmado (EIP-191 / personal_sign)
 * Formato compatible con W3C VC, proof con firma recuperable
 */
export async function issueCredential(
  issuer: Wallet,
  subjectDid: string,
  credentialSubject: CredentialSubject,
  options?: {
    credentialId?: string;
    expirationDate?: string;
    customTypes?: string[];
  },
): Promise<VerifiableCredential> {
  const issuerDid = createDidEthr(issuer.address);
  const now = new Date().toISOString();

  const credential: VerifiableCredential = {
    '@context': [VC_CONTEXT],
    id: options?.credentialId ?? `urn:uuid:${crypto.randomUUID()}`,
    type: [VC_TYPE, ...(options?.customTypes ?? [])],
    issuer: issuerDid,
    issuanceDate: now,
    credentialSubject: {
      id: subjectDid,
      ...credentialSubject,
    },
  };

  if (options?.expirationDate) {
    credential.expirationDate = options.expirationDate;
  }

  const payload = canonicalizeCredential(credential);
  const signature = await issuer.signMessage(toUtf8Bytes(payload));

  credential.proof = {
    type: 'EthereumEip712Signature2021',
    created: now,
    verificationMethod: `${issuerDid}#controller`,
    proofPurpose: 'assertionMethod',
    proofValue: signature,
  };

  return credential;
}

/**
 * Canonicaliza credential para firma (determinístico, orden de claves)
 */
function canonicalizeCredential(credential: Omit<VerifiableCredential, 'proof'>): string {
  return JSON.stringify(sortKeys(credential));
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
