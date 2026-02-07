import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, refreshToken, logout, AuthServiceError } from '../authService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('authService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('register', () => {
    it('should register successfully and return auth response', async () => {
      const mockResponse = {
        accessToken: 'access-token',
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await register({ email: 'test@example.com', password: 'password123' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw AuthServiceError on 409 conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({ message: 'Email already registered' }),
      });

      await expect(register({ email: 'test@example.com', password: 'password123' }))
        .rejects
        .toThrow(AuthServiceError);
    });
  });

  describe('login', () => {
    it('should login successfully and return auth response', async () => {
      const mockResponse = {
        accessToken: 'access-token',
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await login({ email: 'test@example.com', password: 'password123' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw AuthServiceError on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await expect(login({ email: 'test@example.com', password: 'wrong' }))
        .rejects
        .toThrow(AuthServiceError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully via httpOnly cookie', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({}),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await expect(logout('access-token'))
        .resolves
        .toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer access-token',
          },
          credentials: 'include',
          body: JSON.stringify({}),
        })
      );
    });

    it('should throw AuthServiceError on logout failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid token' }),
      });

      await expect(logout('bad-token'))
        .rejects
        .toThrow(AuthServiceError);
    });
  });
});
