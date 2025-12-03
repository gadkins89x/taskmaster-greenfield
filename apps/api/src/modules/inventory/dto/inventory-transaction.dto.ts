import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  RETURN = 'return',
}

export class CreateInventoryTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.ISSUE })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 5, description: 'Positive for receipt/return, negative for issue' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 15.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'WO-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Issued for maintenance work' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class IssueInventoryDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'WO-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Issued for maintenance work' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ReceiveInventoryDto {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 15.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'PO-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: 'Received from supplier' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AdjustInventoryDto {
  @ApiProperty({ example: 100, description: 'New stock quantity after adjustment' })
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiProperty({ example: 'Physical count adjustment' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
