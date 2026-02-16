/**
 * @healthproof/did
 * DID y Verifiable Credentials - base VC-grade
 */

export {
  createDid,
  createDidEthr,
  createDidFromWallet,
  createDidFromPrivateKey,
  didToAddress,
} from './createDid';

export { issueCredential } from './issueCredential';
export { verifyCredential } from './verifyCredential';

export type {
  VerifiableCredential,
  CredentialSubject,
  Proof,
  DidDocument,
  DidMethod,
} from './types';
