import { Module } from '@nestjs/common';
import { JwksController } from './jwks.controller';
import { JwksService } from './jwks.service';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [JwksController],
  providers: [JwksService],
})
export class JwksModule {}
