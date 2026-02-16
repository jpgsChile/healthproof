/**
 * W3C Verifiable Credential types (VC-grade foundation)
 */

export interface CredentialSubject {
  id?: string;
  [key: string]: unknown;
}

export interface VerifiableCredential {
  '@context': string[];
  id?: string;
  type: string[];
  issuer: string | { id: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof?: Proof;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jws?: string;
  proofValue?: string;
}

export interface DidDocument {
  '@context': string[];
  id: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    ethereumAddress?: string;
  }>;
}

export type DidMethod = 'ethr' | 'key';
