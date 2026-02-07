import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import { HashingService } from '../crypto/hashing.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenTtl = Number(
      this.configService.get('JWT_ACCESS_TOKEN_TTL', 900),
    );
    this.refreshTokenTtl = Number(
      this.configService.get('JWT_REFRESH_TOKEN_TTL', 604800),
    );
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashingService.hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      roles: [Role.USER],
      name: dto.name,
    });

    return this.generateTokenPair(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.hashingService.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const parts = refreshToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [userId, tokenId] = parts;
    const redisKey = `refresh_token:${userId}:${tokenId}`;

    const storedHash = await this.redisService.get(redisKey);
    if (!storedHash) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const isValid = await this.hashingService.verifyToken(
      storedHash,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: delete old token
    await this.redisService.del(redisKey);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const parts = refreshToken.split('.');
    if (parts.length === 3) {
      const [userId, tokenId] = parts;
      await this.redisService.del(`refresh_token:${userId}:${tokenId}`);
    }
    return { message: 'Logged out successfully' };
  }

  private async generateTokenPair(user: User): Promise<AuthResponseDto> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles,
    });

    const tokenId = randomUUID();
    const random = randomBytes(32).toString('base64url');
    const opaqueToken = `${user.id}.${tokenId}.${random}`;

    const tokenHash = await this.hashingService.hashToken(opaqueToken);
    await this.redisService.set(
      `refresh_token:${user.id}:${tokenId}`,
      tokenHash,
      this.refreshTokenTtl,
    );

    return {
      accessToken,
      refreshToken: opaqueToken,
      expiresIn: this.accessTokenTtl,
    };
  }
}
