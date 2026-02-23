/**
 * URL検証ツールのテスト
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { URLValidatorTool } from "@/tools/url-validator.js";

describe("URLValidatorTool", () => {
  let tool: URLValidatorTool;

  beforeEach(() => {
    tool = new URLValidatorTool();
  });

  describe("ツール定義", () => {
    test("nameプロパティが正しく設定されている", () => {
      expect(tool.name).toBe("url_validator");
    });

    test("descriptionプロパティが設定されている", () => {
      expect(tool.description).toContain("URL");
      expect(tool.description).toContain("404");
      expect(tool.description).toContain("検証");
    });

    test("schemaが正しく定義されている", () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();

      // オブジェクトとしてパースできる
      const objectResult = schema.safeParse({ urls: ["https://example.com"] });
      expect(objectResult.success).toBe(true);

      // オプションパラメータ付きでもパースできる
      const withTimeout = schema.safeParse({ urls: ["https://example.com"], timeout: 3000 });
      expect(withTimeout.success).toBe(true);

      // 複数URLもOK
      const multipleUrls = schema.safeParse({
        urls: ["https://example.com", "https://example.org"],
      });
      expect(multipleUrls.success).toBe(true);
    });

    test("無効なURLはスキーマ検証で弾かれる", () => {
      const schema = tool.schema;
      const invalidUrl = schema.safeParse({ urls: ["not-a-url"] });
      expect(invalidUrl.success).toBe(false);
    });

    test("URLが10個を超えるとスキーマ検証で弾かれる", () => {
      const schema = tool.schema;
      const urls = Array.from({ length: 11 }, (_, i) => `https://example${i}.com`);
      const tooManyUrls = schema.safeParse({ urls });
      expect(tooManyUrls.success).toBe(false);
    });
  });

  describe("_callメソッド - 正常系", () => {
    test("有効なURL（200）を正しく検証できる", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ urls: ["https://example.com"] });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].url).toBe("https://example.com");
      expect(parsed.results[0].status).toBe("valid");
      expect(parsed.results[0].statusCode).toBe(200);
      expect(parsed.summary.total).toBe(1);
      expect(parsed.summary.valid).toBe(1);
      expect(parsed.summary.invalid).toBe(0);
    });

    test("複数のURLを一括検証できる", async () => {
      const mockResponse200 = {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
      };

      const mockResponse404 = {
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
      };

      let callCount = 0;
      global.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockResponse200 as Response);
        }
        return Promise.resolve(mockResponse404 as Response);
      });

      const result = await tool._call({
        urls: ["https://example.com", "https://example.com/notfound"],
      });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(2);
      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.valid).toBe(1);
      expect(parsed.summary.invalid).toBe(1);
    });

    test("リダイレクト（301）を正しく追跡できる", async () => {
      const mockRedirectResponse = {
        status: 301,
        statusText: "Moved Permanently",
        headers: new Headers({ location: "https://example.com/new" }),
      };

      const mockFinalResponse = {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
      };

      let callCount = 0;
      global.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockRedirectResponse as Response);
        }
        return Promise.resolve(mockFinalResponse as Response);
      });

      const result = await tool._call({ urls: ["https://example.com/old"] });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].status).toBe("redirect");
      expect(parsed.results[0].statusCode).toBe(301);
      expect(parsed.results[0].finalUrl).toBe("https://example.com/new");
      expect(parsed.summary.redirect).toBe(1);
    });

    test("302リダイレクトも正しく追跡できる", async () => {
      const mockRedirectResponse = {
        status: 302,
        statusText: "Found",
        headers: new Headers({ location: "/new-path" }),
      };

      const mockFinalResponse = {
        status: 200,
        statusText: "OK",
        headers: new Headers(),
      };

      let callCount = 0;
      global.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockRedirectResponse as Response);
        }
        return Promise.resolve(mockFinalResponse as Response);
      });

      const result = await tool._call({ urls: ["https://example.com/redirect"] });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].status).toBe("redirect");
      expect(parsed.results[0].finalUrl).toBe("https://example.com/new-path");
    });

    test("2xx系のステータスコードは全て有効と判定される", async () => {
      const statusCodes = [200, 201, 204, 206];

      for (const statusCode of statusCodes) {
        const mockResponse = {
          status: statusCode,
          statusText: "OK",
          headers: new Headers(),
        };

        global.fetch = mock(() => Promise.resolve(mockResponse as Response));

        const result = await tool._call({ urls: [`https://example.com/${statusCode}`] });
        const parsed = JSON.parse(result);

        expect(parsed.results[0].status).toBe("valid");
        expect(parsed.results[0].statusCode).toBe(statusCode);
      }
    });
  });

  describe("_callメソッド - 異常系", () => {
    test("404エラーを正しく検出できる", async () => {
      const mockResponse = {
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ urls: ["https://example.com/notfound"] });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].statusCode).toBe(404);
      expect(parsed.results[0].error).toBe("Not Found");
      expect(parsed.summary.invalid).toBe(1);
    });

    test("500エラーを正しく検出できる", async () => {
      const mockResponse = {
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ urls: ["https://example.com/error"] });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].statusCode).toBe(500);
      expect(parsed.results[0].error).toBe("Internal Server Error");
    });

    test("403エラーを正しく検出できる", async () => {
      const mockResponse = {
        status: 403,
        statusText: "Forbidden",
        headers: new Headers(),
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ urls: ["https://example.com/forbidden"] });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].statusCode).toBe(403);
      expect(parsed.results[0].error).toBe("Forbidden");
    });

    test("タイムアウト時にエラーメッセージを返す", async () => {
      const abortError = new Error("Request timeout");
      abortError.name = "AbortError";

      global.fetch = mock(() => Promise.reject(abortError));

      const result = await tool._call({ urls: ["https://example.com/timeout"], timeout: 1000 });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].error).toContain("タイムアウト");
    });

    test("ネットワークエラー時にエラーメッセージを返す", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error")));

      const result = await tool._call({ urls: ["https://example.com"] });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].error).toContain("ネットワークエラー");
    });

    test("リダイレクト回数が上限を超えた場合エラーになる", async () => {
      // 常にリダイレクトを返すモック
      const mockRedirectResponse = {
        status: 301,
        statusText: "Moved Permanently",
        headers: new Headers({ location: "https://example.com/loop" }),
      };

      global.fetch = mock(() => Promise.resolve(mockRedirectResponse as Response));

      const result = await tool._call({ urls: ["https://example.com/loop"] });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].error).toContain("リダイレクト回数");
    });

    test("Locationヘッダーがないリダイレクトはエラーになる", async () => {
      const mockRedirectResponse = {
        status: 301,
        statusText: "Moved Permanently",
        headers: new Headers(), // locationヘッダーなし
      };

      global.fetch = mock(() => Promise.resolve(mockRedirectResponse as Response));

      const result = await tool._call({ urls: ["https://example.com/redirect-no-location"] });
      const parsed = JSON.parse(result);

      expect(parsed.results[0].status).toBe("invalid");
      expect(parsed.results[0].error).toContain("リダイレクト先");
    });
  });

  describe("サマリー集計", () => {
    test("複数URLの結果が正しく集計される", async () => {
      const responses = [
        { status: 200, statusText: "OK", headers: new Headers() },
        { status: 301, statusText: "Moved", headers: new Headers({ location: "https://example.com/new" }) },
        { status: 404, statusText: "Not Found", headers: new Headers() },
        { status: 200, statusText: "OK", headers: new Headers() },
        { status: 500, statusText: "Error", headers: new Headers() },
      ];

      // 2回目のリダイレクト先は200を返す
      const mockFinalResponse = { status: 200, statusText: "OK", headers: new Headers() };

      let callCount = 0;
      global.fetch = mock(() => {
        callCount++;
        if (callCount <= 5) {
          return Promise.resolve(responses[callCount - 1] as Response);
        }
        return Promise.resolve(mockFinalResponse as Response);
      });

      const result = await tool._call({
        urls: [
          "https://example.com/1",
          "https://example.com/2",
          "https://example.com/3",
          "https://example.com/4",
          "https://example.com/5",
        ],
      });
      const parsed = JSON.parse(result);

      expect(parsed.summary.total).toBe(5);
      expect(parsed.summary.valid).toBe(2);
      expect(parsed.summary.redirect).toBe(1);
      expect(parsed.summary.invalid).toBe(2);
    });
  });
});
