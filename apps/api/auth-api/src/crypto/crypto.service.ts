import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createPublicKey, JsonWebKey } from 'crypto';
import { readFileSync } from 'fs';

@Injectable()
export class CryptoService {
  private privateKey: string;
  private publicKey: string;
  private jwk: JsonWebKey;
  private kid: string;

  constructor(private readonly config: ConfigService) {
    this.loadKeys();
    this.buildJwk();
  }

  private loadKeys(): void {
    const rawPrivate = this.config.get<string>('RSA_PRIVATE_KEY');
    const rawPublic = this.config.get<string>('RSA_PUBLIC_KEY');

    if (rawPrivate) {
      this.privateKey = Buffer.from(rawPrivate, 'base64').toString('utf-8');
    } else {
      const path = this.config.getOrThrow<string>('RSA_PRIVATE_KEY_PATH');
      this.privateKey = readFileSync(path, 'utf-8');
    }

    if (rawPublic) {
      this.publicKey = Buffer.from(rawPublic, 'base64').toString('utf-8');
    } else {
      const path = this.config.getOrThrow<string>('RSA_PUBLIC_KEY_PATH');
      this.publicKey = readFileSync(path, 'utf-8');
    }
  }

  private buildJwk(): void {
    const keyObject = createPublicKey(this.publicKey);
    const exported = keyObject.export({ format: 'jwk' });
    this.kid = createHash('sha256')
      .update(this.publicKey)
      .digest('hex')
      .substring(0, 16);
    this.jwk = { ...exported, kid: this.kid, use: 'sig', alg: 'RS256' };
  }

  getPrivateKey(): string {
    return this.privateKey;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getJwk(): JsonWebKey {
    return this.jwk;
  }

  getKid(): string {
    return this.kid;
  }
}
