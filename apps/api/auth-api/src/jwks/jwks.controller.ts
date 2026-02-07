import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JsonWebKey } from 'crypto';
import { JwksService } from './jwks.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('jwks')
@Controller('.well-known')
export class JwksController {
  private readonly logger = new Logger(JwksController.name);

  constructor(private readonly jwksService: JwksService) {}

  @Get('jwks.json')
  @Public()
  @ApiOperation({
    summary: 'JSON Web Key Set endpoint for public key discovery',
  })
  getJwks(): { keys: JsonWebKey[] } {
    this.logger.log('Serving JWKS public keys');
    return this.jwksService.getKeySet();
  }
}
