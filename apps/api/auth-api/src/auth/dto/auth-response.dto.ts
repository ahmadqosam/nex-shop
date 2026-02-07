import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'RS256-signed JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token TTL in seconds' })
  expiresIn: number;
}
