import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { CryptoModule } from '../crypto/crypto.module';
import { CryptoService } from '../crypto/crypto.service';

@Module({
  imports: [
    UsersModule,
    CryptoModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [CryptoModule],
      inject: [CryptoService, ConfigService],
      useFactory: (crypto: CryptoService, config: ConfigService) => ({
        privateKey: crypto.getPrivateKey(),
        publicKey: crypto.getPublicKey(),
        signOptions: {
          algorithm: 'RS256' as const,
          expiresIn: Number(config.get('JWT_ACCESS_TOKEN_TTL', 900)),
          issuer: 'auth-api',
          keyid: crypto.getKid(),
        },
        verifyOptions: {
          algorithms: ['RS256' as const],
          issuer: 'auth-api',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
