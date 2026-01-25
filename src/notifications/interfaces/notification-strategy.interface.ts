/**
 * NotificationStrategy 인터페이스
 * 다양한 알림 타입(Push, Email, Slack 등)을 위한 전략 패턴 인터페이스
 */
export interface NotificationPayload {
  notificationLogId: string;
  jobId: string;
  jobName: string;
  prevHealth: string | null;
  nextHealth: string;
  reason: string;
}

export interface NotificationResult {
  success: boolean;
  recipientCount: number;
  errors: Array<{
    recipientId: string;
    errorMessage: string;
  }>;
}

export interface NotificationStrategy {
  /**
   * 알림 발송
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * 설정 검증
   */
  validate(): boolean;
}
