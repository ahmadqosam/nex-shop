import { JwtStrategy } from './jwt.strategy';
import { Role } from '../../common/enums/role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockCryptoService = {
      getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
    };
    strategy = new JwtStrategy(mockCryptoService as any);
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
