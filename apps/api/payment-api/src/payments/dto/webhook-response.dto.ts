import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({ description: 'Whether the webhook was received', example: true })
  received!: boolean;
}
