export interface CreateApiLogDto {
  requestId: string;
  method: string;
  url: string;
  query: Record<string, unknown> | null;
  statusCode: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  userId?: string | null;
  errorMessage?: string | null;
}
