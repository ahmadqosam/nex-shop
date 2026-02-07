import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const context = createMockContext({
      sub: '1',
      email: 'admin@test.com',
      roles: [Role.ADMIN, Role.USER],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const context = createMockContext({
      sub: '1',
      email: 'user@test.com',
      roles: [Role.USER],
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when user has no roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const context = createMockContext({
      sub: '1',
      email: 'user@test.com',
      roles: undefined,
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when there is no user', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const context = createMockContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow when any of multiple required roles match', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.USER]);
    const context = createMockContext({
      sub: '1',
      email: 'user@test.com',
      roles: [Role.USER],
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
