import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import type { DocumentMetadata } from './dto/upload-document.dto';

export interface UploadDocumentResult {
  id: string;
  documentHash: string;
  metadataHash: string;
  txHash: string;
  issuerId: string;
}

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private blockchain: BlockchainService,
    private storage: StorageService,
  ) {}

  /**
   * Flujo completo: upload -> hash -> encrypt metadata -> store -> blockchain -> DB
   * Sin datos médicos en blockchain.
   */
  async uploadDocument(
    file: Express.Multer.File,
    issuerId: string,
    metadata: DocumentMetadata,
  ): Promise<UploadDocumentResult> {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const issuer = await this.prisma.issuer.findUnique({
      where: { id: issuerId, isActive: true },
    });
    if (!issuer) {
      throw new BadRequestException('Issuer not found or inactive');
    }

    // 1. SHA-256 del documento
    const documentHash = this.crypto.sha256(file.buffer);

    // 2. Verificar duplicado
    const existing = await this.prisma.document.findUnique({
      where: { documentHash },
    });
    if (existing) {
      throw new BadRequestException('Document already registered');
    }

    // 3. Encriptar metadata (AES-256)
    const metadataJson = JSON.stringify(metadata);
    const keyEnv = process.env.METADATA_ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error('METADATA_ENCRYPTION_KEY is required');
    }
    // 64 hex chars = 32 bytes, usar como clave directa; sino passphrase para scrypt
    const encryptionKey =
      /^[0-9a-fA-F]{64}$/.test(keyEnv) ? Buffer.from(keyEnv, 'hex') : keyEnv;
    const encrypted = this.crypto.encryptAes256(metadataJson, encryptionKey);
    const encryptedBuffer = this.crypto.serializeEncrypted(encrypted);

    // 4. metadataHash = SHA-256 de metadata en claro (para blockchain)
    const metadataHash = this.crypto.sha256(Buffer.from(metadataJson, 'utf8'));

    // 5. Crear documento en DB (sin txHash aún)
    const doc = await this.prisma.document.create({
      data: {
        documentHash,
        metadataHash,
        issuerId,
        encryptedMetadataPath: null,
        txHash: null,
      },
    });

    // 6. Almacenar metadata encriptada
    const storedPath = await this.storage.storeEncryptedMetadata(doc.id, encryptedBuffer);
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { encryptedMetadataPath: storedPath },
    });

    // 7. Enviar hashes a Avalanche (solo hashes, sin datos médicos)
    const tx = await this.blockchain.registerDocument(
      documentHash,
      metadataHash,
      issuer.walletAddress,
    );
    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;

    // 8. Guardar txHash en DB
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { txHash },
    });

    return {
      id: doc.id,
      documentHash,
      metadataHash,
      txHash,
      issuerId,
    };
  }

  async getDocumentsByWallet(walletAddress: string) {
    if (!walletAddress) return { documents: [] };
    const issuer = await this.prisma.issuer.findUnique({
      where: { walletAddress, isActive: true },
    });
    if (!issuer) return { documents: [] };
    const documents = await this.prisma.document.findMany({
      where: { issuerId: issuer.id },
      select: {
        id: true,
        documentHash: true,
        metadataHash: true,
        txHash: true,
        revoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      documents: documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }
}
