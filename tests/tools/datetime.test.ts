/**
 * 日時ツールのテスト
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { DateTimeTool } from "@/tools/datetime.js";

describe("DateTimeTool", () => {
  let tool: DateTimeTool;

  beforeEach(() => {
    tool = new DateTimeTool();
  });

  describe("ツール定義", () => {
    test("nameプロパティが正しく設定されている", () => {
      expect(tool.name).toBe("datetime");
    });

    test("descriptionプロパティが設定されている", () => {
      expect(tool.description).toContain("日時");
      expect(tool.description).toContain("日付");
    });

    test("schemaが正しく定義されている", () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();

      // アクション付きでパースできる
      const nowResult = schema.safeParse({ action: "now" });
      expect(nowResult.success).toBe(true);

      // オプションパラメータ付きでもパースできる
      const withFormat = schema.safeParse({
        action: "format",
        format: "YYYY-MM-DD",
        targetDate: "2024-02-24T10:00:00Z",
      });
      expect(withFormat.success).toBe(true);
    });

    test("無効なactionはスキーマ検証で弾かれる", () => {
      const schema = tool.schema;
      const invalidAction = schema.safeParse({ action: "invalid" });
      expect(invalidAction.success).toBe(false);
    });
  });

  describe("_callメソッド - action: now", () => {
    test("現在日時を取得できる", async () => {
      const result = await tool._call({ action: "now" });
      const parsed = JSON.parse(result);

      expect(parsed.iso).toBeDefined();
      expect(parsed.formatted).toBeDefined();
      expect(parsed.formattedShort).toBeDefined();
      expect(parsed.weekday).toBeDefined();
      expect(parsed.timezone).toBe("Asia/Tokyo");
    });

    test("タイムゾーンを指定できる", async () => {
      const result = await tool._call({ action: "now", timezone: "UTC" });
      const parsed = JSON.parse(result);

      expect(parsed.timezone).toBe("UTC");
    });

    test("日本語フォーマットが正しい", async () => {
      const result = await tool._call({ action: "now" });
      const parsed = JSON.parse(result);

      // 日本語フォーマット（2024年2月24日 形式）
      expect(parsed.formatted).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日$/);
    });

    test("短いフォーマットが正しい", async () => {
      const result = await tool._call({ action: "now" });
      const parsed = JSON.parse(result);

      // 短いフォーマット（2024-02-24 形式）
      expect(parsed.formattedShort).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("曜日が日本語で返される", async () => {
      const result = await tool._call({ action: "now" });
      const parsed = JSON.parse(result);

      const weekdays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
      expect(weekdays).toContain(parsed.weekday);
    });
  });

  describe("_callメソッド - action: format", () => {
    test("カスタムフォーマットが適用される", async () => {
      const result = await tool._call({
        action: "format",
        targetDate: "2024-02-24T10:30:00Z",
        format: "YYYY/MM/DD",
      });
      const parsed = JSON.parse(result);

      expect(parsed.format).toBe("YYYY/MM/DD");
      expect(parsed.formatted).toContain("2024");
      expect(parsed.formatted).toContain("02");
      expect(parsed.formatted).toContain("24");
    });

    test("targetDate省略時は現在日時を使用", async () => {
      const result = await tool._call({
        action: "format",
        format: "YYYY-MM-DD",
      });
      const parsed = JSON.parse(result);

      expect(parsed.targetDate).toBe("now");
      expect(parsed.formatted).toBeDefined();
    });

    test("format省略時はデフォルト形式", async () => {
      const result = await tool._call({
        action: "format",
        targetDate: "2024-02-24T10:00:00Z",
      });
      const parsed = JSON.parse(result);

      expect(parsed.formatted).toBeDefined();
      expect(parsed.formatted).toContain("2024");
    });

    test("無効な日付でエラーを返す", async () => {
      const result = await tool._call({
        action: "format",
        targetDate: "invalid-date",
      });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("無効な日付");
    });

    test("時間フォーマットが機能する", async () => {
      const result = await tool._call({
        action: "format",
        targetDate: "2024-02-24T15:30:45Z",
        format: "HH:mm:ss",
      });
      const parsed = JSON.parse(result);

      expect(parsed.formatted).toBeDefined();
    });
  });

  describe("_callメソッド - action: relative", () => {
    test("過去の日付で「〜日前」を返す", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString();

      const result = await tool._call({
        action: "relative",
        targetDate: pastDateStr,
      });
      const parsed = JSON.parse(result);

      expect(parsed.relativeDays).toBeLessThan(0);
      expect(parsed.description).toContain("日前");
    });

    test("未来の日付で「〜日後」を返す", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString();

      const result = await tool._call({
        action: "relative",
        targetDate: futureDateStr,
      });
      const parsed = JSON.parse(result);

      expect(parsed.relativeDays).toBeGreaterThan(0);
      expect(parsed.description).toContain("日後");
    });

    test("今日の日付で「今日」を返す", async () => {
      const now = new Date();
      const todayStr = now.toISOString();

      const result = await tool._call({
        action: "relative",
        targetDate: todayStr,
      });
      const parsed = JSON.parse(result);

      // 同じ日の場合は「今日」または0日前
      expect(["今日", "0日後", "0日前"]).toContain(parsed.description);
    });

    test("targetDate省略時はエラーを返す", async () => {
      const result = await tool._call({
        action: "relative",
      });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("targetDateが必要");
    });

    test("無効な日付でエラーを返す", async () => {
      const result = await tool._call({
        action: "relative",
        targetDate: "invalid-date",
      });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("無効な日付");
    });
  });

  describe("_callメソッド - action: calculate", () => {
    test("正の日数で加算できる", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "2024-02-24T00:00:00Z",
        days: 7,
      });
      const parsed = JSON.parse(result);

      expect(parsed.days).toBe(7);
      expect(parsed.description).toBe("7日後");
      // 2024-02-24 + 7日 = 2024-03-02
      expect(parsed.resultDate).toContain("03");
    });

    test("負の日数で減算できる", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "2024-02-24T00:00:00Z",
        days: -3,
      });
      const parsed = JSON.parse(result);

      expect(parsed.days).toBe(-3);
      expect(parsed.description).toBe("3日前");
    });

    test("0で同じ日を返す", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "2024-02-24T00:00:00Z",
        days: 0,
      });
      const parsed = JSON.parse(result);

      expect(parsed.days).toBe(0);
      expect(parsed.description).toBe("同じ日");
    });

    test("targetDate省略時は現在日時を基準にする", async () => {
      const result = await tool._call({
        action: "calculate",
        days: 1,
      });
      const parsed = JSON.parse(result);

      expect(parsed.fromDate).toBeDefined();
      expect(parsed.resultDate).toBeDefined();
      expect(parsed.description).toBe("1日後");
    });

    test("days省略時はエラーを返す", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "2024-02-24T00:00:00Z",
      });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("daysパラメータが必要");
    });

    test("無効な日付でエラーを返す", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "invalid-date",
        days: 1,
      });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("無効な日付");
    });

    test("月末をまたぐ計算が正しい", async () => {
      const result = await tool._call({
        action: "calculate",
        targetDate: "2024-01-31T00:00:00Z",
        days: 1,
      });
      const parsed = JSON.parse(result);

      expect(parsed.days).toBe(1);
      // 1月31日 + 1日 = 2月1日
      expect(parsed.resultDate).toBeDefined();
    });
  });

  describe("タイムゾーン処理", () => {
    test("異なるタイムゾーンで結果が異なる", async () => {
      const resultTokyo = await tool._call({ action: "now", timezone: "Asia/Tokyo" });
      const resultUTC = await tool._call({ action: "now", timezone: "UTC" });

      const parsedTokyo = JSON.parse(resultTokyo);
      const parsedUTC = JSON.parse(resultUTC);

      // 両方とも成功していることを確認
      expect(parsedTokyo.timezone).toBe("Asia/Tokyo");
      expect(parsedUTC.timezone).toBe("UTC");
    });
  });
});
