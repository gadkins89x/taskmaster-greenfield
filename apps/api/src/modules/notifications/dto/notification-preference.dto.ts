import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from './notification.types';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}

export class BulkUpdatePreferencesDto {
  @ApiProperty({ type: [UpdateNotificationPreferenceDto] })
  preferences: UpdateNotificationPreferenceDto[];
}
