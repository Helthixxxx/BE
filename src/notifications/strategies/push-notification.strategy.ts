import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  NotificationStrategy,
  NotificationPayload,
  NotificationResult,
} from "../interfaces/notification-strategy.interface";
import { Device } from "../../devices/entities/device.entity";
import { NotificationRecipient } from "../../notification-recipients/entities/notification-recipient.entity";

/**
 * Expo Push API 응답 타입
 */
interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

/**
 * PushNotificationStrategy
 * Expo Push API를 사용한 푸시 알림 발송 전략
 */
@Injectable()
export class PushNotificationStrategy implements NotificationStrategy {
  private readonly logger = new Logger(PushNotificationStrategy.name);
  private readonly expoPushApiUrl = "https://exp.host/--/api/v2/push/send";

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(NotificationRecipient)
    private readonly recipientRepository: Repository<NotificationRecipient>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 알림 발송
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const { notificationLogId, jobId, jobName, prevHealth, nextHealth, reason } = payload;

    // 1. 활성화된 Device 목록 조회
    const devices = await this.deviceRepository.find({
      where: { isActive: true },
    });

    if (devices.length === 0) {
      this.logger.warn("발송할 활성화된 Device가 없습니다.");
      return {
        success: true,
        recipientCount: 0,
        errors: [],
      };
    }

    // 2. 알림 메시지 생성
    const title = this.getNotificationTitle(prevHealth, nextHealth);
    const body = this.getNotificationBody(jobName, reason);

    // 3. Expo Push API 요청 데이터 생성
    const messages = devices.map((device) => ({
      to: device.pushToken,
      sound: "default",
      title,
      body,
      data: {
        jobId,
        jobName,
        prevHealth,
        nextHealth,
        reason,
      },
    }));

    // 4. Expo Push API 호출
    let result: NotificationResult;
    try {
      const response = await firstValueFrom(
        this.httpService.post<ExpoPushResponse>(this.expoPushApiUrl, messages, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
        }),
      );

      // 5. 응답 처리 및 NotificationRecipient 기록
      result = await this.processResponse(devices, response.data.data, notificationLogId);
    } catch (error) {
      this.logger.error(
        `Expo Push API 호출 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
      );

      // 모든 Device에 대해 실패로 기록
      result = await this.processError(devices, notificationLogId, error);
    }

    return result;
  }

  /**
   * Expo Push API 응답 처리
   */
  private async processResponse(
    devices: Device[],
    tickets: ExpoPushTicket[],
    notificationLogId: string,
  ): Promise<NotificationResult> {
    const errors: Array<{ recipientId: string; errorMessage: string }> = [];
    let successCount = 0;

    // 트랜잭션 내에서 NotificationRecipient 기록
    await this.dataSource.transaction(async (manager) => {
      const recipientRepo = manager.getRepository(NotificationRecipient);

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const ticket = tickets[i];

        if (ticket.status === "ok") {
          successCount++;
          // 성공한 경우 NotificationRecipient 기록
          const recipient = recipientRepo.create({
            notificationLogId,
            deviceId: device.id,
            userId: device.userId,
            status: "sent",
            sentAt: new Date(),
          });
          await recipientRepo.save(recipient);
        } else {
          // 실패한 경우
          const errorMessage = ticket.message || ticket.details?.error || "Unknown error";
          errors.push({
            recipientId: device.id,
            errorMessage: String(errorMessage),
          });

          // DeviceNotRegistered 에러인 경우 Device 비활성화
          if (
            errorMessage.includes("DeviceNotRegistered") ||
            errorMessage.includes("InvalidCredentials")
          ) {
            device.isActive = false;
            await manager.getRepository(Device).save(device);
            this.logger.warn(`Device ${device.id} 비활성화: ${errorMessage}`);
          }

          // 실패한 경우 NotificationRecipient 기록
          const recipient = recipientRepo.create({
            notificationLogId,
            deviceId: device.id,
            userId: device.userId,
            status: "failed",
            errorMessage: String(errorMessage),
          });
          await recipientRepo.save(recipient);
        }
      }
    });

    return {
      success: errors.length === 0,
      recipientCount: successCount,
      errors,
    };
  }

  /**
   * 에러 처리
   * 배치 저장으로 최적화
   */
  private async processError(
    devices: Device[],
    notificationLogId: string,
    error: unknown,
  ): Promise<NotificationResult> {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // 모든 Device에 대해 실패로 기록 (배치 저장)
    await this.dataSource.transaction(async (manager) => {
      const recipientRepo = manager.getRepository(NotificationRecipient);

      const recipients = devices.map((device) =>
        recipientRepo.create({
          notificationLogId,
          deviceId: device.id,
          userId: device.userId,
          status: "failed",
          errorMessage,
        }),
      );

      if (recipients.length > 0) {
        await recipientRepo.save(recipients);
      }
    });

    return {
      success: false,
      recipientCount: 0,
      errors: devices.map((device) => ({
        recipientId: device.id,
        errorMessage,
      })),
    };
  }

  /**
   * 알림 제목 생성
   */
  private getNotificationTitle(prevHealth: string | null, nextHealth: string): string {
    if (nextHealth === "FAILED") {
      return "🚨 서비스 장애 발생";
    } else if (prevHealth === "FAILED" && nextHealth === "NORMAL") {
      return "✅ 서비스 복구 완료";
    }
    return "📊 서비스 상태 변경";
  }

  /**
   * 알림 본문 생성
   */
  private getNotificationBody(jobName: string, reason: string): string {
    return `${jobName}\n${reason}`;
  }

  /**
   * 설정 검증
   */
  validate(): boolean {
    // Expo Push API는 별도 인증이 필요 없으므로 항상 true
    return true;
  }
}
