import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description:
      'Opaque refresh token (optional if sent via httpOnly cookie)',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
