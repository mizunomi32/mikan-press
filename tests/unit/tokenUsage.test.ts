/**
 * tokenUsage.ts のテスト
 *
 * getUsage() 関数のトークン抽出ロジックと Type Guard 関数を検証します。
 */

import { describe, expect, test } from "bun:test";
import { getUsage, logTokenUsage } from "../../src/tokenUsage.js";

// Type Guard 関数は非公開なので、テスト用に間接的に検証
// 実際には logTokenUsage を通じて動作を確認する

describe("getUsage", () => {
  describe("OpenAI形式のトークン使用量", () => {
    test("input_tokens/output_tokens/total_tokensを正しく抽出", () => {
      const result = {
        usage_metadata: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(100);
      expect(usage?.output).toBe(50);
      expect(usage?.total).toBe(150);
    });

    test("total_tokensがない場合はinput+outputで計算", () => {
      const result = {
        usage_metadata: {
          input_tokens: 80,
          output_tokens: 40,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(80);
      expect(usage?.output).toBe(40);
      expect(usage?.total).toBe(120);
    });

    test("input_tokensのみの場合", () => {
      const result = {
        usage_metadata: {
          input_tokens: 100,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(100);
      expect(usage?.output).toBe(0);
      expect(usage?.total).toBe(100);
    });

    test("output_tokensのみの場合", () => {
      const result = {
        usage_metadata: {
          output_tokens: 50,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(0);
      expect(usage?.output).toBe(50);
      expect(usage?.total).toBe(50);
    });
  });

  describe("Gemini形式のトークン使用量（prompt_tokens/completion_tokens）", () => {
    test("prompt_tokens/completion_tokens/total_tokensを正しく抽出", () => {
      const result = {
        usage_metadata: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(200);
      expect(usage?.output).toBe(100);
      expect(usage?.total).toBe(300);
    });

    test("total_tokensがない場合はprompt+completionで計算", () => {
      const result = {
        usage_metadata: {
          prompt_tokens: 150,
          completion_tokens: 75,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(150);
      expect(usage?.output).toBe(75);
      expect(usage?.total).toBe(225);
    });
  });

  describe("response_metadata.tokenUsage形式（LangChain）", () => {
    test("promptTokens/completionTokens/totalTokensを正しく抽出", () => {
      const result = {
        response_metadata: {
          tokenUsage: {
            promptTokens: 150,
            completionTokens: 75,
            totalTokens: 225,
          },
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(150);
      expect(usage?.output).toBe(75);
      expect(usage?.total).toBe(225);
    });

    test("totalTokensがない場合はpromptTokens+completionTokensで計算", () => {
      const result = {
        response_metadata: {
          tokenUsage: {
            promptTokens: 100,
            completionTokens: 50,
          },
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(100);
      expect(usage?.output).toBe(50);
      expect(usage?.total).toBe(150);
    });

    test("promptTokensのみの場合は0を返す", () => {
      const result = {
        response_metadata: {
          tokenUsage: {
            promptTokens: 80,
          },
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(80);
      expect(usage?.output).toBe(0);
      expect(usage?.total).toBe(80);
    });
  });

  describe("response_metadata.usage形式", () => {
    test("response_metadata.usageも正しく処理", () => {
      const result = {
        response_metadata: {
          usage: {
            input_tokens: 120,
            output_tokens: 60,
            total_tokens: 180,
          },
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(120);
      expect(usage?.output).toBe(60);
      expect(usage?.total).toBe(180);
    });
  });

  describe("優先順位のテスト", () => {
    test("usage_metadataがresponse_metadata.usageより優先", () => {
      const result = {
        usage_metadata: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        },
        response_metadata: {
          usage: {
            input_tokens: 200,
            output_tokens: 100,
            total_tokens: 300,
          },
        },
      };

      const usage = getUsage(result);

      // usage_metadataの値が使用される
      expect(usage?.input).toBe(100);
      expect(usage?.output).toBe(50);
      expect(usage?.total).toBe(150);
    });
  });

  describe("境界値とエッジケース", () => {
    test("空のオブジェクトはnullを返す", () => {
      const result = {};
      const usage = getUsage(result);
      expect(usage).toBeNull();
    });

    test("undefinedのメタデータはnullを返す", () => {
      const result = {
        usage_metadata: undefined,
        response_metadata: undefined,
      };
      const usage = getUsage(result);
      expect(usage).toBeNull();
    });

    test("空のusage_metadataはnullを返す", () => {
      const result = {
        usage_metadata: {},
      };
      const usage = getUsage(result);
      expect(usage).toBeNull();
    });

    test("0トークンを正しく処理", () => {
      const result = {
        usage_metadata: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
        },
      };

      const usage = getUsage(result);

      expect(usage).not.toBeNull();
      expect(usage?.input).toBe(0);
      expect(usage?.output).toBe(0);
      expect(usage?.total).toBe(0);
    });
  });
});

describe("logTokenUsage", () => {
  test("有効な LangChain 結果でトークン使用量をログ出力", () => {
    const mockLogger = {
      info: [],
      debug: [],
    };

    // logger.info と logger.debug をモック
    const originalInfo = global.console.info;
    const originalDebug = global.console.debug;
    global.console.info = (...args: unknown[]) => mockLogger.info.push(args);
    global.console.debug = (...args: unknown[]) => mockLogger.debug.push(args);

    const result = {
      usage_metadata: {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      },
    };

    // エラーがスローされないことを確認
    expect(() => logTokenUsage("TestAgent", result)).not.toThrow();

    global.console.info = originalInfo;
    global.console.debug = originalDebug;
  });

  test("無効な型でデバッグログを出力（エラーをスローしない）", () => {
    const mockLogger = {
      debug: [],
    };

    const originalDebug = global.console.debug;
    global.console.debug = (...args: unknown[]) => mockLogger.debug.push(args);

    // 無効な型を渡してもエラーをスローしない
    expect(() => logTokenUsage("TestAgent", null)).not.toThrow();
    expect(() => logTokenUsage("TestAgent", undefined)).not.toThrow();
    expect(() => logTokenUsage("TestAgent", "invalid")).not.toThrow();
    expect(() => logTokenUsage("TestAgent", 123)).not.toThrow();

    global.console.debug = originalDebug;
  });

  test("空のオブジェクトでログ出力をスキップ", () => {
    const originalInfo = global.console.info;
    const infoCalls: unknown[][] = [];
    global.console.info = (...args: unknown[]) => infoCalls.push(args);

    logTokenUsage("TestAgent", {});
    logTokenUsage("TestAgent", { usage_metadata: undefined });

    // 空のオブジェクトではログが出力されない
    expect(infoCalls.length).toBe(0);

    global.console.info = originalInfo;
  });
});
