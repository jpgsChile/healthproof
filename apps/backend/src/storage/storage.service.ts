import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly basePath: string;

  constructor(private config: ConfigService) {
    this.basePath = this.config.get<string>('STORAGE_PATH', './storage');
  }

  /**
   * Almacena buffer (ej. metadata encriptada) y retorna path relativo
   */
  async storeEncryptedMetadata(
    documentId: string,
    data: Buffer,
  ): Promise<string> {
    const dir = join(this.basePath, 'metadata');
    await fs.mkdir(dir, { recursive: true });

    const filename = `${documentId}.enc`;
    const filepath = join(dir, filename);
    await fs.writeFile(filepath, data);

    return filename;
  }

  /**
   * Lee metadata encriptada por path
   */
  async readEncryptedMetadata(relativePath: string): Promise<Buffer> {
    const filepath = join(this.basePath, 'metadata', relativePath);
    return fs.readFile(filepath);
  }

  /**
   * Verifica que el directorio base exista
   */
  async ensureStorageDir(): Promise<void> {
    await fs.mkdir(join(this.basePath, 'metadata'), { recursive: true });
  }
}
