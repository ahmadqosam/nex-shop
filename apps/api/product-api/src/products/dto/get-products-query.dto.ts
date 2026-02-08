import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetProductsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Headphone',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim())
  category?: string;

  @ApiPropertyOptional({
    description: 'Search by product name',
    example: 'Nex',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'basePriceInCents',
    enum: ['name', 'basePriceInCents', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'basePriceInCents' | 'createdAt' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
