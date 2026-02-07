// Auth API Types

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  expiresIn: number;
}

export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
}

export interface AuthError {
  statusCode: number;
  message: string;
}
