/**
 * logger.ts のテスト
 *
 * ログレベル制御・出力フィルタリングを検証します。
 */

import { describe, expect, test } from "bun:test";
import { Logger } from "../../src/logger.js";

// コンソール出力をキャプチャするヘルパー
let capturedLogs: { level: string; args: unknown[] }[] = [];
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function captureConsole() {
  capturedLogs = [];
  console.log = (...args) => capturedLogs.push({ level: "log", args });
  console.warn = (...args) => capturedLogs.push({ level: "warn", args });
  console.error = (...args) => capturedLogs.push({ level: "error", args });
}

function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

describe("Logger", () => {
  describe("ログレベルの初期化", () => {
    test("デフォルトはinfoレベル", () => {
      // LOG_LEVEL環境変数を削除
      delete process.env.LOG_LEVEL;
      const logger = new Logger();

      // infoレベルではdebug以外が出力されるはず
      captureConsole();
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(capturedLogs.length).toBe(3); // debugは出力されない
      expect(capturedLogs[0].level).toBe("log");
      expect(capturedLogs[1].level).toBe("warn");
      expect(capturedLogs[2].level).toBe("error");

      restoreConsole();
    });

    test("LOG_LEVEL=debug ですべて出力", () => {
      process.env.LOG_LEVEL = "debug";
      const logger = new Logger();

      captureConsole();
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(capturedLogs.length).toBe(4);

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });

    test("LOG_LEVEL=error でerrorのみ出力", () => {
      process.env.LOG_LEVEL = "error";
      const logger = new Logger();

      captureConsole();
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].level).toBe("error");

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });

    test("LOG_LEVEL=warn でwarnとerrorを出力", () => {
      process.env.LOG_LEVEL = "warn";
      const logger = new Logger();

      captureConsole();
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(capturedLogs.length).toBe(2);

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });

    test("無効なログレベルはデフォルト（info）になる", () => {
      process.env.LOG_LEVEL = "invalid";
      const logger = new Logger();

      captureConsole();
      logger.debug("debug message");
      logger.info("info message");

      expect(capturedLogs.length).toBe(1); // debugは出力されない

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });
  });

  describe("ログ出力のフォーマット", () => {
    test("errorメッセージに[ERROR]プレフィックスとタイムスタンプ", () => {
      process.env.LOG_LEVEL = "error";
      const logger = new Logger();

      captureConsole();
      logger.error("test error");

      expect(capturedLogs.length).toBe(1);
      // 新しいフォーマット: [timestamp] [ERROR] message
      expect(capturedLogs[0].args[0]).toMatch(/\[.*\] \[ERROR\] test error/);

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });

    test("warnメッセージに[WARN]プレフィックス", () => {
      process.env.LOG_LEVEL = "warn";
      const logger = new Logger();

      captureConsole();
      logger.warn("test warning");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].args[0]).toBe("[WARN]");
      expect(capturedLogs[0].args[1]).toBe("test warning");

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });

    test("infoメッセージに[INFO]プレフィックス", () => {
      const logger = new Logger();

      captureConsole();
      logger.info("test info");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].args[0]).toBe("[INFO]");
      expect(capturedLogs[0].args[1]).toBe("test info");

      restoreConsole();
    });

    test("debugメッセージに[DEBUG]プレフィックス", () => {
      process.env.LOG_LEVEL = "debug";
      const logger = new Logger(); // 環境変数設定後に作成

      captureConsole();
      logger.debug("test debug");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].args[0]).toBe("[DEBUG]");
      expect(capturedLogs[0].args[1]).toBe("test debug");

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });
  });

  describe("複数引数の処理", () => {
    test("複数の引数を正しく出力", () => {
      const logger = new Logger();

      captureConsole();
      logger.info("test", "multiple", "arguments");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].args).toHaveLength(4); // プレフィックス + 3引数

      restoreConsole();
    });

    test("オブジェクト引数を正しく出力", () => {
      const logger = new Logger();

      captureConsole();
      logger.info("test object", { key: "value" });

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0].args).toHaveLength(3); // プレフィックス + 2引数

      restoreConsole();
    });
  });

  describe("ログレベルの優先順位", () => {
    test("LEVEL_PRIORITYの順序が正しい", () => {
      // 直接テストすることはできないが、動作で確認
      process.env.LOG_LEVEL = "warn";
      const logger = new Logger(); // 環境変数設定後に作成

      captureConsole();
      logger.debug("should not show");
      logger.info("should not show");
      logger.warn("should show");
      logger.error("should show");

      expect(capturedLogs.length).toBe(2);

      restoreConsole();
      delete process.env.LOG_LEVEL;
    });
  });
});
