/**
 * spinner.ts のテスト
 *
 * スピナー開始/停止の基本動作を検証します。
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startSpinner, stopSpinner, withSpinner } from "../../src/spinner.js";

// setIntervalとclearIntervalをモック
let mockIntervals: Array<{ id: number; callback: () => void; ms: number }> = [];
let nextIntervalId = 1;

const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const originalWrite = process.stderr.write;
let mockIsTTY = false;

beforeEach(() => {
  mockIntervals = [];
  nextIntervalId = 1;
  mockIsTTY = true; // デフォルトはTTY

  // setIntervalをモック
  globalThis.setInterval = ((callback: () => void, ms: number) => {
    const id = nextIntervalId++;
    mockIntervals.push({ id, callback, ms });
    return id as unknown as ReturnType<typeof setInterval>;
  }) as typeof globalThis.setInterval;

  // clearIntervalをモック
  globalThis.clearInterval = ((id: unknown) => {
    const numId = id as number;
    mockIntervals = mockIntervals.filter((i) => i.id !== numId);
  }) as typeof globalThis.clearInterval;

  // stderr.writeをモック
  process.stderr.write = (() => true) as typeof process.stderr.write;
});

afterEach(() => {
  // 確実にスピナーを停止
  stopSpinner();

  // 元の実装に戻す
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  process.stderr.write = originalWrite;
});

// spinner.ts内のTTYチェックをバイパスするためのヘルパー
// Note: 実際のTTYチェックはモジュール読み込み時に評価されるため
// 完全なテストにはモジュールのリロードが必要ですが、
// ここでは基本的なロジックテストに留めます
describe("startSpinner", () => {
  test("モック環境での基本的な動作", () => {
    // スピナー開始
    startSpinner("テスト");

    // 注: 実際の環境では process.stderr.isTTY の値によって
    // インターバルが開始されるかどうかが決まりますが
    // モック環境では挙動が異なる可能性があります
    // ここではエラーが発生しないことを確認します

    expect(() => startSpinner("テスト")).not.toThrow();

    // スピナー停止
    stopSpinner();
  });

  test("連続呼び出しでエラーが発生しない", () => {
    expect(() => {
      startSpinner("最初");
      startSpinner("二回目");
      stopSpinner();
    }).not.toThrow();
  });
});

describe("stopSpinner", () => {
  test("実行中でない場合はエラーが発生しない", () => {
    // 何も開始していない状態で停止
    expect(() => stopSpinner()).not.toThrow();
  });

  test("clearLineオプションでエラーが発生しない", () => {
    startSpinner("テスト");
    expect(() => stopSpinner(false)).not.toThrow();
    expect(() => stopSpinner(true)).not.toThrow();
  });
});

describe("withSpinner", () => {
  test("非同期処理の完了を待機", async () => {
    let executed = false;

    const result = await withSpinner("処理中", async () => {
      executed = true;
      return "テスト結果";
    });

    expect(executed).toBe(true);
    expect(result).toBe("テスト結果");
  });

  test("エラーが発生しても正しく伝播", async () => {
    const error = new Error("テストエラー");

    await expect(
      withSpinner("処理中", async () => {
        throw error;
      }),
    ).rejects.toThrow("テストエラー");
  });

  test("複数の非同期処理を順次実行", async () => {
    const results: string[] = [];

    await withSpinner("処理1", async () => {
      results.push("first");
    });

    await withSpinner("処理2", async () => {
      results.push("second");
    });

    expect(results).toEqual(["first", "second"]);
  });

  test("入れ子のスピナー使用", async () => {
    const order: string[] = [];

    await withSpinner("外側", async () => {
      order.push("outer-start");

      await withSpinner("内側", async () => {
        order.push("inner");
      });

      order.push("outer-end");
    });

    expect(order).toEqual(["outer-start", "inner", "outer-end"]);
  });
});

// setInterval/clearIntervalのモック動作テスト
describe("モック検証", () => {
  test("setIntervalモックが正しく動作", () => {
    let callbackCalled = false;

    const id = globalThis.setInterval(() => {
      callbackCalled = true;
    }, 100);

    expect(typeof id).toBe("number");
    expect(mockIntervals.length).toBe(1);

    // コールバックを手動で実行
    if (mockIntervals[0]) {
      mockIntervals[0].callback();
      expect(callbackCalled).toBe(true);
    }

    globalThis.clearInterval(id);
    expect(mockIntervals.length).toBe(0);
  });

  test("clearIntervalモックが正しく動作", () => {
    const id1 = globalThis.setInterval(() => {}, 100);
    const id2 = globalThis.setInterval(() => {}, 100);

    expect(mockIntervals.length).toBe(2);

    globalThis.clearInterval(id1);
    expect(mockIntervals.length).toBe(1);

    globalThis.clearInterval(id2);
    expect(mockIntervals.length).toBe(0);
  });
});
