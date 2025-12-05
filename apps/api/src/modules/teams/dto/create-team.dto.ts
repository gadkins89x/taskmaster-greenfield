import { IsString, IsOptional, IsBoolean, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ description: 'Team name', example: 'Maintenance' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Short code for the team (uppercase letters/numbers)',
    example: 'MAINT',
  })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must contain only uppercase letters, numbers, underscores, and hyphens',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Team description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Hex color for UI display',
    example: '#3B82F6',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  color?: string;

  @ApiPropertyOptional({ description: 'Whether the team is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
