import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMaintenanceScheduleDto } from './create-schedule.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaintenanceScheduleDto extends PartialType(
  OmitType(CreateMaintenanceScheduleDto, ['steps'] as const),
) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
