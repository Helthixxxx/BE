import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationLog } from "./entities/notification-log.entity";
import { CreateNotificationLogDto } from "./dto/create-notification-log.dto";

/**
 * NotificationLogsService
 * NotificationLog 생성 및 조회 로직
 * Health 상태 전이 시 기록
 */
@Injectable()
export class NotificationLogsService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
  ) {}

  /**
   * NotificationLog 생성
   * Health 상태 전이 시 호출
   */
  async create(createDto: CreateNotificationLogDto): Promise<NotificationLog> {
    const log = this.notificationLogRepository.create(createDto);
    return await this.notificationLogRepository.save(log);
  }

  /**
   * Job의 NotificationLog 목록 조회
   */
  async findByJobId(jobId: string): Promise<NotificationLog[]> {
    return await this.notificationLogRepository.find({
      where: { jobId },
      order: { sentAt: "DESC" },
    });
  }

  /**
   * NotificationLog 상태 업데이트
   */
  async updateStatus(
    id: string,
    status: string,
    recipientCount: number,
    errorMessage?: string | null,
  ): Promise<void> {
    await this.notificationLogRepository.update(id, {
      status,
      recipientCount,
      errorMessage: errorMessage || null,
    });
  }
}
