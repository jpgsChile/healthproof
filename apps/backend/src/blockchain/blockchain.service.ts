import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract,
  Wallet,
  JsonRpcProvider,
  hexZeroPad,
  type ContractTransactionResponse,
} from 'ethers';

const DOCUMENT_REGISTRY_ABI = [
  'function registerDocument(bytes32 documentHash, address issuer, bytes32 metadataHash) external',
  'function verifyDocument(bytes32 documentHash) external view returns (bool exists, address issuer, uint256 timestamp)',
  'event DocumentRegistered(bytes32 indexed documentHash, address indexed issuer, bytes32 indexed metadataHash, uint256 timestamp)',
];

@Injectable()
export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly contract: Contract;
  private readonly contractAddress: string;

  constructor(private config: ConfigService) {
    const rpcUrl = this.config.get<string>('AVALANCHE_RPC_URL', 'https://api.avax-test.network/ext/bc/C/rpc');
    const privateKey = this.config.get<string>('BLOCKCHAIN_PRIVATE_KEY');
    this.contractAddress = this.config.get<string>('DOCUMENT_REGISTRY_ADDRESS', '');

    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PRIVATE_KEY is required for document registration');
    }
    if (!this.contractAddress) {
      throw new Error('DOCUMENT_REGISTRY_ADDRESS is required');
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    this.contract = new Contract(this.contractAddress, DOCUMENT_REGISTRY_ABI, this.wallet);
  }

  /**
   * Registra hash de documento en Avalanche (sin datos médicos)
   * @param documentHashHex SHA-256 del documento en hex
   * @param metadataHashHex SHA-256 de metadata en hex
   * @param issuerAddress Wallet del emisor (debe coincidir con signer en prod)
   */
  async registerDocument(
    documentHashHex: string,
    metadataHashHex: string,
    issuerAddress: string,
  ): Promise<ContractTransactionResponse> {
    const documentHash = this.hexToBytes32(documentHashHex);
    const metadataHash = this.hexToBytes32(metadataHashHex);

    const tx = await this.contract.registerDocument(
      documentHash,
      issuerAddress,
      metadataHash,
    );
    return tx;
  }

  /**
   * Verifica documento en blockchain
   */
  async verifyDocument(documentHashHex: string): Promise<{
    exists: boolean;
    issuer: string;
    timestamp: bigint;
  }> {
    const documentHash = this.hexToBytes32(documentHashHex);
    const [exists, issuer, timestamp] = await this.contract.verifyDocument(documentHash);
    return { exists, issuer, timestamp };
  }

  private hexToBytes32(hex: string): `0x${string}` {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return hexZeroPad(`0x${clean}`, 32) as `0x${string}`;
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }
}
