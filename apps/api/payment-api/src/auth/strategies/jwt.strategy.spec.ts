import { JwtStrategy } from './jwt.strategy';
import { Role } from '../enums/role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: jest
        .fn()
        .mockReturnValue(
          Buffer.from('mock-public-key-pem').toString('base64'),
        ),
    };
    strategy = new JwtStrategy(mockConfigService as any);
  });

  describe('validate', () => {
    it('should return the JWT payload with sub, email, and roles', () => {
      const payload = {
        sub: 'user-uuid',
        email: 'test@example.com',
        roles: [Role.USER],
        iat: 123456,
        exp: 654321,
      };

      const result = strategy.validate(payload);
      expect(result).toEqual({
        sub: 'user-uuid',
        email: 'test@example.com',
        roles: [Role.USER],
      });
    });

    it('should strip iat and exp from the result', () => {
      const payload = {
        sub: 'admin-uuid',
        email: 'admin@example.com',
        roles: [Role.ADMIN, Role.USER],
        iat: 123456,
        exp: 654321,
      };

      const result = strategy.validate(payload);
      expect(result).not.toHaveProperty('iat');
      expect(result).not.toHaveProperty('exp');
    });
  });
});
