import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { HashingService } from '../crypto/hashing.service';
import { RedisService } from '../redis/redis.service';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let hashingService: jest.Mocked<HashingService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser: User = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    passwordHash: 'argon2-hashed-password',
    roles: [Role.USER],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: HashingService,
          useValue: {
            hashPassword: jest.fn().mockResolvedValue('hashed-password'),
            verifyPassword: jest.fn(),
            hashToken: jest.fn().mockResolvedValue('hashed-token'),
            verifyToken: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              const map: Record<string, any> = {
                JWT_ACCESS_TOKEN_TTL: 900,
                JWT_REFRESH_TOKEN_TTL: 604800,
              };
              return map[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    hashingService = module.get(HashingService);
    redisService = module.get(RedisService);
  });

  describe('register', () => {
    it('should create a user and return token pair', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'P@ssw0rd123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(hashingService.hashPassword).toHaveBeenCalledWith('P@ssw0rd123');
      expect(usersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        roles: [Role.USER],
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'P@ssw0rd123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return token pair for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      hashingService.verifyPassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'P@ssw0rd123',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'P@ssw0rd123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      hashingService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use the same error message for both email and password failures', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const emailError = await service
        .login({ email: 'unknown@example.com', password: 'P@ssw0rd123' })
        .catch((e) => e);

      usersService.findByEmail.mockResolvedValue(mockUser);
      hashingService.verifyPassword.mockResolvedValue(false);
      const passwordError = await service
        .login({ email: 'test@example.com', password: 'wrong' })
        .catch((e) => e);

      expect(emailError.message).toBe(passwordError.message);
    });
  });

  describe('refresh', () => {
    const validRefreshToken =
      'user-uuid-123.token-id-456.random-bytes-base64url';

    it('should return new token pair for valid refresh token', async () => {
      redisService.get.mockResolvedValue('stored-hash');
      hashingService.verifyToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh(validRefreshToken);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(validRefreshToken);
      expect(redisService.del).toHaveBeenCalledWith(
        'refresh_token:user-uuid-123:token-id-456',
      );
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      await expect(service.refresh('malformed-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired/revoked token', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if hash verification fails', async () => {
      redisService.get.mockResolvedValue('stored-hash');
      hashingService.verifyToken.mockResolvedValue(false);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      redisService.get.mockResolvedValue('stored-hash');
      hashingService.verifyToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      const result = await service.logout(
        'user-uuid-123.token-id-456.random-bytes',
      );
      expect(redisService.del).toHaveBeenCalledWith(
        'refresh_token:user-uuid-123:token-id-456',
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle malformed token gracefully', async () => {
      const result = await service.logout('malformed-token');
      expect(redisService.del).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('generateTokenPair (via register)', () => {
    it('should sign JWT with correct payload', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'test@example.com',
        password: 'P@ssw0rd123',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
      });
    });

    it('should store hashed refresh token in Redis with correct TTL', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'test@example.com',
        password: 'P@ssw0rd123',
      });

      expect(hashingService.hashToken).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token:user-uuid-123:'),
        'hashed-token',
        604800,
      );
    });

    it('should return refresh token in correct format', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'P@ssw0rd123',
      });

      const parts = result.refreshToken.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(mockUser.id);
    });
  });
});
