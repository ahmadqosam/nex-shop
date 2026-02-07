import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  email: string;
  passwordHash: string;
  roles: Role[];
  name?: string;
}
