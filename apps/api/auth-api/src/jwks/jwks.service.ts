import { Injectable } from '@nestjs/common';
import { JsonWebKey } from 'crypto';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class JwksService {
  constructor(private readonly cryptoService: CryptoService) {}

  getKeySet(): { keys: JsonWebKey[] } {
    return {
      keys: [this.cryptoService.getJwk()],
    };
  }
}
