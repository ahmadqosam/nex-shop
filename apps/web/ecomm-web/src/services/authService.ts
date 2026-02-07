import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  AuthError,
} from '../types/auth';

const AUTH_API_BASE = '/api';

class AuthServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      statusCode: response.status,
      message: response.statusText,
    }));
    throw new AuthServiceError(error.message || response.statusText, response.status);
  }
  return response.json();
}

export async function register(dto: RegisterDto): Promise<AuthResponseDto> {
  const response = await fetch(`${AUTH_API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AuthResponseDto>(response);
}

export async function login(dto: LoginDto): Promise<AuthResponseDto> {
  const response = await fetch(`${AUTH_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AuthResponseDto>(response);
}

export async function refreshToken(): Promise<AuthResponseDto> {
  const response = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  return handleResponse<AuthResponseDto>(response);
}

export async function logout(accessToken: string): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      statusCode: response.status,
      message: response.statusText,
    }));
    throw new AuthServiceError(error.message || response.statusText, response.status);
  }
}

export { AuthServiceError };
