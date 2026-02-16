import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IssuerService {
  constructor(private prisma: PrismaService) {}

  async getByWallet(walletAddress: string) {
    const issuer = await this.prisma.issuer.findUnique({
      where: { walletAddress, isActive: true },
    });
    return issuer;
  }
}
