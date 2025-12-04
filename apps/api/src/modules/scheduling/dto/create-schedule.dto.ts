import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum SchedulePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class ScheduleStepDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  stepOrder: number;

  @ApiProperty({ example: 'Check oil level' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Ensure oil is between min and max markers' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateMaintenanceScheduleDto {
  @ApiProperty({ example: 'Monthly HVAC Filter Replacement' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Replace air filters in all HVAC units' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ enum: SchedulePriority, example: SchedulePriority.MEDIUM })
  @IsOptional()
  @IsEnum(SchedulePriority)
  priority?: SchedulePriority;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  // Recurrence
  @ApiProperty({ enum: ScheduleFrequency, example: ScheduleFrequency.MONTHLY })
  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Every N periods' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({
    example: [1, 3],
    description: 'Days of week (0=Sun, 1=Mon, ..., 6=Sat). Required for weekly.',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: 15, description: 'Day of month (1-31). Required for monthly.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ example: 6, description: 'Month of year (1-12). For yearly schedules.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  // Schedule window
  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 7, default: 7, description: 'Days before due date to create WO' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  leadTimeDays?: number;

  // Work order template
  @ApiProperty({ example: 'HVAC Filter Replacement' })
  @IsString()
  @MaxLength(200)
  workOrderTitle: string;

  @ApiPropertyOptional({ example: 'preventive', default: 'preventive' })
  @IsOptional()
  @IsString()
  workOrderType?: string;

  // Steps (optional, can be added later)
  @ApiPropertyOptional({ type: [ScheduleStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleStepDto)
  steps?: ScheduleStepDto[];
}
