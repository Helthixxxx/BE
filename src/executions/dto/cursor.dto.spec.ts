import { encodeCursor, decodeCursor } from "./cursor.dto";

describe("Cursor DTO", () => {
  describe("encodeCursor", () => {
    it("객체를 base64 인코딩", () => {
      const cursor = { createdAt: "2025-01-01T00:00:00.000Z", id: 1 };
      const encoded = encodeCursor(cursor);

      expect(encoded).toBe(Buffer.from(JSON.stringify(cursor)).toString("base64"));
    });
  });

  describe("decodeCursor", () => {
    it("base64 디코딩 후 객체 반환", () => {
      const cursor = { createdAt: "2025-01-01T00:00:00.000Z", id: 5 };
      const encoded = encodeCursor(cursor);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(cursor);
    });

    it("잘못된 형식이면 에러", () => {
      expect(() => decodeCursor("invalid!!!")).toThrow("유효하지 않은 Cursor 형식입니다.");
    });
  });
});
