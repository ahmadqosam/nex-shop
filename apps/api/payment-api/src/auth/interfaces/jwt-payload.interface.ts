import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}
