import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'mock-access-token',
    refreshToken: 'user-id.token-id.random',
    expiresIn: 900,
  };

  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  const mockReq = (cookies: Record<string, string> = {}) =>
    ({ cookies } as unknown as Request);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockAuthResponse),
            login: jest.fn().mockResolvedValue(mockAuthResponse),
            refresh: jest.fn().mockResolvedValue(mockAuthResponse),
            logout: jest
              .fn()
              .mockResolvedValue({ message: 'Logged out successfully' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                JWT_REFRESH_TOKEN_TTL: 604800,
                NODE_ENV: 'development',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register, set cookie, and return result', async () => {
      const dto = { email: 'test@example.com', password: 'P@ssw0rd123' };
      const result = await controller.register(dto, mockRes);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockAuthResponse.refreshToken,
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login, set cookie, and return result', async () => {
      const dto = { email: 'test@example.com', password: 'P@ssw0rd123' };
      const result = await controller.login(dto, mockRes);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockAuthResponse.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    it('should read refreshToken from cookie', async () => {
      const req = mockReq({ refresh_token: 'cookie-token' });
      const dto = { refreshToken: '' };
      const result = await controller.refresh(req, dto, mockRes);
      expect(authService.refresh).toHaveBeenCalledWith('cookie-token');
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(result).toEqual(mockAuthResponse);
    });

    it('should fall back to body refreshToken when no cookie', async () => {
      const req = mockReq();
      const dto = { refreshToken: 'body-token' };
      const result = await controller.refresh(req, dto, mockRes);
      expect(authService.refresh).toHaveBeenCalledWith('body-token');
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('logout', () => {
    it('should read refreshToken from cookie and clear it', async () => {
      const req = mockReq({ refresh_token: 'cookie-token' });
      const dto = { refreshToken: '' };
      const result = await controller.logout(req, dto, mockRes);
      expect(authService.logout).toHaveBeenCalledWith('cookie-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should fall back to body refreshToken when no cookie', async () => {
      const req = mockReq();
      const dto = { refreshToken: 'body-token' };
      const result = await controller.logout(req, dto, mockRes);
      expect(authService.logout).toHaveBeenCalledWith('body-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
