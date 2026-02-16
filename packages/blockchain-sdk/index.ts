/**
 * @healthproof/blockchain-sdk
 * Abstracción para backend + frontend
 */

export {
  createNodeProvider,
  createReadOnlyProvider,
  connectBrowserProvider,
  DOCUMENT_REGISTRY_ABI,
  type BlockchainConfig,
} from './provider';

export { registerDocument, type RegisterDocumentParams, type RegisterDocumentResult } from './registerDocument';
export { verifyDocument, type VerifyDocumentResult } from './verifyDocument';
