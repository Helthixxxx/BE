/**
 * Cursor DTO
 * cursor pagination을 위한 커서 정보
 * base64 인코딩된 JSON 문자열로 전달
 */
export interface Cursor {
  createdAt: string; // ISO timestamp
  id: number;
}

/**
 * Cursor를 base64 인코딩
 */
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * base64 인코딩된 cursor를 디코딩
 */
export function decodeCursor(cursorString: string): Cursor {
  try {
    const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
    return JSON.parse(decoded) as Cursor;
  } catch {
    // 에러 변수 사용하지 않음
    throw new Error('Invalid cursor format');
  }
}
