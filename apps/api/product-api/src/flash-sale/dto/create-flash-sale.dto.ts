import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFlashSaleDto {
  @ApiProperty({ description: 'Name of the flash sale' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Start time of the flash sale (ISO 8601 string)',
    example: new Date().toISOString(),
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'End time of the flash sale (ISO 8601 string)',
    example: new Date(Date.now() + 3600_000).toISOString(),
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Whether the flash sale is currently active',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


