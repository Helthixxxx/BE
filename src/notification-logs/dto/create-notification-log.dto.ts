import { IsUUID, IsEnum, IsString, IsNotEmpty, IsDate, IsOptional } from "class-validator";
import { Health } from "../../common/types/health.enum";
import { Type } from "class-transformer";

/** NotificationLog 생성 DTO */
export class CreateNotificationLogDto {
  @IsUUID()
  jobId: string;

  @IsOptional()
  @IsEnum(Health)
  prevHealth: Health | null;

  @IsEnum(Health)
  @IsNotEmpty({ message: "nextHealth는 필수 입력 필드입니다." })
  nextHealth: Health;

  @IsString()
  @IsNotEmpty({ message: "reason는 필수 입력 필드입니다." })
  reason: string;

  @IsDate()
  @IsNotEmpty({ message: "sentAt는 필수 입력 필드입니다." })
  @Type(() => Date)
  sentAt: Date;

  @IsOptional()
  @IsString()
  notificationType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
