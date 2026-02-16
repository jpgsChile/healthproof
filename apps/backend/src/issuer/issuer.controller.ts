import { Controller, Get, Param } from '@nestjs/common';
import { IssuerService } from './issuer.service';

@Controller('issuers')
export class IssuerController {
  constructor(private issuerService: IssuerService) {}

  @Get('by-wallet/:address')
  async getByWallet(@Param('address') address: string) {
    return this.issuerService.getByWallet(address);
  }
}
