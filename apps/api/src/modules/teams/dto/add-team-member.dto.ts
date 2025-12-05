import { IsString, IsOptional, IsBoolean, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to the team' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Role within the team',
    enum: ['member', 'lead', 'admin'],
    default: 'member',
  })
  @IsOptional()
  @IsString()
  @IsIn(['member', 'lead', 'admin'])
  role?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the user\'s primary team',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({
    description: 'Role within the team',
    enum: ['member', 'lead', 'admin'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['member', 'lead', 'admin'])
  role?: string;

  @ApiPropertyOptional({ description: 'Whether this is the user\'s primary team' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
