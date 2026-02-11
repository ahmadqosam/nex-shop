import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PurchaseFlashSaleItemDto {
  @ApiProperty({ description: 'ID of the flash sale item to purchase' })
  @IsString()
  @IsNotEmpty()
  flashSaleItemId: string;
}


