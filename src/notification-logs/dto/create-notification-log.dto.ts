import { IsUUID, IsEnum, IsString, IsNotEmpty, IsDate, IsOptional } from "class-validator";
import { Health } from "../../common/enums/health.enum";
import { Type } from "class-transformer";

/**
 * CreateNotificationLogDto
 * NotificationLog 생성 시 사용하는 DTO
 */
export class CreateNotificationLogDto {
  @IsUUID()
  jobId: string;

  @IsOptional()
  @IsEnum(Health)
  prevHealth: Health | null;

  @IsEnum(Health)
  @IsNotEmpty()
  nextHealth: Health;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsDate()
  @Type(() => Date)
  sentAt: Date;

  @IsOptional()
  @IsString()
  notificationType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
