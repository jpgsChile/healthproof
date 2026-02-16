import {
  Contract,
  JsonRpcProvider,
  Wallet,
  BrowserProvider,
  type Signer,
  type Provider,
} from 'ethers';

export interface BlockchainConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey?: string;
}

export const DOCUMENT_REGISTRY_ABI = [
  'function registerDocument(bytes32 documentHash, address issuer, bytes32 metadataHash) external',
  'function verifyDocument(bytes32 documentHash) view returns (bool exists, address issuer, uint256 timestamp)',
  'function revokeDocument(bytes32 documentHash) external',
] as const;

/**
 * Crea provider para Node (backend)
 */
export function createNodeProvider(config: BlockchainConfig): {
  provider: JsonRpcProvider;
  signer: Signer;
  contract: Contract;
} {
  const provider = new JsonRpcProvider(config.rpcUrl);
  if (!config.privateKey) {
    throw new Error('privateKey required for Node provider');
  }
  const signer = new Wallet(config.privateKey, provider);
  const contract = new Contract(config.contractAddress, DOCUMENT_REGISTRY_ABI, signer);
  return { provider, signer, contract };
}

/**
 * Crea provider read-only (sin signer) - frontend/backend
 */
export function createReadOnlyProvider(
  config: Pick<BlockchainConfig, 'rpcUrl' | 'contractAddress'>,
): {
  provider: JsonRpcProvider;
  contract: Contract;
} {
  const provider = new JsonRpcProvider(config.rpcUrl);
  const contract = new Contract(config.contractAddress, DOCUMENT_REGISTRY_ABI, provider);
  return { provider, contract };
}

/**
 * Conecta con signer de browser (ethers.BrowserProvider)
 */
export async function connectBrowserProvider(
  config: Pick<BlockchainConfig, 'contractAddress'>,
  ethereum: unknown,
): Promise<{
  provider: BrowserProvider;
  signer: Signer;
  contract: Contract;
}> {
  const provider = new BrowserProvider(ethereum as import('ethers').Eip1193Provider);
  const signer = await provider.getSigner();
  const contract = new Contract(config.contractAddress, DOCUMENT_REGISTRY_ABI, signer);
  return { provider, signer, contract };
}
