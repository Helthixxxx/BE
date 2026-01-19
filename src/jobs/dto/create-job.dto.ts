import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsUrl,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HttpMethod } from '../../common/enums/http-method.enum';

/**
 * CreateJobDto
 * Job 생성 시 사용하는 DTO
 */
export class CreateJobDto {
  @ApiProperty({
    description: 'Job 이름',
    example: 'API Health Check',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '실행 주기 (분)',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  scheduleMinutes: number;

  @ApiProperty({
    description: 'HTTP 메서드',
    enum: HttpMethod,
    example: HttpMethod.GET,
  })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({
    description: '요청 URL',
    example: 'https://api.example.com/health',
  })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({
    description: '요청 헤더',
    example: { 'Content-Type': 'application/json' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: '요청 본문',
    example: { key: 'value' },
  })
  @IsOptional()
  body?: any;

  @ApiPropertyOptional({
    description: '활성화 여부',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
