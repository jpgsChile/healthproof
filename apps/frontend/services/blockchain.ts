import { ethers } from 'ethers';

const DOCUMENT_REGISTRY_ABI = [
  'function verifyDocument(bytes32 documentHash) view returns (bool exists, address issuer, uint256 timestamp)',
];

const RPC_URL =
  process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL ??
  'https://api.avax-test.network/ext/bc/C/rpc';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_ADDRESS ?? '';

export const blockchainService = {
  async verifyDocument(documentHash: string): Promise<{
    exists: boolean;
    issuer: string;
    timestamp: bigint;
  }> {
    if (!CONTRACT_ADDRESS) {
      throw new Error('DOCUMENT_REGISTRY_ADDRESS not configured');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      DOCUMENT_REGISTRY_ABI,
      provider,
    );

    const clean = documentHash.trim().replace(/^0x/, '');
    const hashBytes32 =
      clean.length === 64 && /^[0-9a-fA-F]+$/.test(clean)
        ? (`0x${clean}` as `0x${string}`)
        : (ethers.zeroPadValue(`0x${clean}`, 32) as `0x${string}`);

    const [exists, issuer, timestamp] = await contract.verifyDocument(hashBytes32);
    return { exists, issuer, timestamp };
  },
};
