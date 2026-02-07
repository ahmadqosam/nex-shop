import { Test, TestingModule } from '@nestjs/testing';
import { JwksController } from './jwks.controller';
import { JwksService } from './jwks.service';

describe('JwksController', () => {
  let controller: JwksController;
  let jwksService: jest.Mocked<JwksService>;

  const mockKeySet = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: 'test-kid',
        n: 'modulus',
        e: 'AQAB',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JwksController],
      providers: [
        {
          provide: JwksService,
          useValue: {
            getKeySet: jest.fn().mockReturnValue(mockKeySet),
          },
        },
      ],
    }).compile();

    controller = module.get<JwksController>(JwksController);
    jwksService = module.get(JwksService);
  });

  describe('getJwks', () => {
    it('should return JWKS from service', () => {
      const result = controller.getJwks();
      expect(jwksService.getKeySet).toHaveBeenCalled();
      expect(result).toEqual(mockKeySet);
    });
  });
});
