import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 4, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: false, description: 'Has previous page' })
  hasPrevious: boolean;

  @ApiProperty({ example: false, description: 'Has next page' })
  hasNext: boolean;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
