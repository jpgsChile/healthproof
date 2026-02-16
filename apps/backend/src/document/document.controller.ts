import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import type { DocumentMetadata } from './dto/upload-document.dto';

@Controller('documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get()
  async getDocuments(@Query('wallet') wallet?: string) {
    return this.documentService.getDocumentsByWallet(wallet ?? '');
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('issuerId') issuerId: string,
    @Body('metadata') metadataJson?: string,
  ) {
    if (!issuerId) {
      throw new BadRequestException('issuerId is required');
    }

    let metadata: DocumentMetadata = {};
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson) as DocumentMetadata;
      } catch {
        throw new BadRequestException('metadata must be valid JSON');
      }
    }

    return this.documentService.uploadDocument(file, issuerId, metadata);
  }
}
