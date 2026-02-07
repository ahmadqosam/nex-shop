import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { HashingService } from './hashing.service';

@Module({
  providers: [CryptoService, HashingService],
  exports: [CryptoService, HashingService],
})
export class CryptoModule {}
