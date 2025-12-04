import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from './notification.types';

export class CreateNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.WORK_ORDER_ASSIGNED })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Work Order Assigned' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'You have been assigned to work order WO-2024-001' })
  @IsString()
  @MaxLength(1000)
  body: string;

  @ApiPropertyOptional({
    example: { entityType: 'workOrder', entityId: '550e8400-e29b-41d4-a716-446655440000' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class BulkNotificationDto {
  @ApiProperty({ type: [String], example: ['user-id-1', 'user-id-2'] })
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM_ANNOUNCEMENT })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'System Maintenance' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'System will undergo maintenance tonight' })
  @IsString()
  @MaxLength(1000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class MarkNotificationsReadDto {
  @ApiProperty({ type: [String], example: ['notification-id-1', 'notification-id-2'] })
  @IsUUID('4', { each: true })
  notificationIds: string[];
}
