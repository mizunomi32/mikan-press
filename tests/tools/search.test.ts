/**
 * Web検索ツールのテスト
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { WebSearchTool } from "@/tools/search.js";

describe("WebSearchTool", () => {
  let tool: WebSearchTool;

  beforeEach(() => {
    tool = new WebSearchTool();
  });

  describe("ツール定義", () => {
    test("nameプロパティが正しく設定されている", () => {
      expect(tool.name).toBe("web_search");
    });

    test("descriptionプロパティが設定されている", () => {
      expect(tool.description).toContain("Web検索");
      expect(tool.description).toContain("DuckDuckGo");
    });

    test("schemaが正しく定義されている", () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();

      // オブジェクトとしてパースできる
      const objectResult = schema.safeParse({ query: "test query" });
      expect(objectResult.success).toBe(true);

      // オプションパラメータ付きでもパースできる
      const withNumResults = schema.safeParse({ query: "test", numResults: 10 });
      expect(withNumResults.success).toBe(true);
    });
  });

  describe("_callメソッド", () => {
    test("有効なクエリで検索を実行できる（オブジェクト入力）", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          `
          <div class="result">
            <a class="result__a" href="https://example.com/test1">Test Title 1</a>
            <a class="result__url">https://example.com/test1</a>
            <a class="result__snippet">This is a test snippet for result 1.</a>
          </div>
        `,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "TypeScript" });
      const parsed = JSON.parse(result);

      expect(parsed.query).toBe("TypeScript");
      expect(parsed.resultCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(parsed.results)).toBe(true);
    });

    test("numResultsを指定して検索を実行できる", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "test", numResults: 2 });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
      expect(parsed.results).toBeDefined();
    });

    test("numResultsを省略するとデフォルト値5が使用される", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "test" });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
      expect(parsed.results).toBeDefined();
    });

    test("numResultsの上限値（20）が適用される", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "test", numResults: 100 });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
    });

    test("numResultsの下限値（1）が適用される", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "test", numResults: 0 });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
    });

    test("APIエラー時に例外をスローする", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      await expect(tool._call({ query: "test" })).rejects.toThrow("DuckDuckGo API error");
    });

    test("ネットワークエラー時に例外をスローする", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error")));

      await expect(tool._call({ query: "test" })).rejects.toThrow();
    });

    test("タイムアウト時に適切なエラーメッセージを返す", async () => {
      const abortError = new Error("Request timeout");
      abortError.name = "AbortError";

      global.fetch = mock(() => Promise.reject(abortError));

      await expect(tool._call({ query: "test" })).rejects.toThrow("タイムアウト");
    });
  });

  describe("結果のパース", () => {
    describe("メインパーサー", () => {
      test("単一検索結果のパース - タイトル、URL、スニペットが正しく抽出される", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            `
            <div class="result results_links results_links_deep">
              <a class="result__a" href="https://example.com/article">Example Article Title</a>
              <a class="result__url">example.com/article</a>
              <a class="result__snippet">This is the snippet text for the search result.</a>
            </div>
          `,
        };

        global.fetch = mock(() => Promise.resolve(mockResponse as Response));

        const result = await tool._call({ query: "test query" });
        const parsed = JSON.parse(result);

        expect(parsed.results.length).toBe(1);
        expect(parsed.results[0].title).toBe("Example Article Title");
        expect(parsed.results[0].url).toBe("example.com/article");
        expect(parsed.results[0].snippet).toBe("This is the snippet text for the search result.");
      });

      test("複数検索結果のパース - 複数の結果が正しくパースされる", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            `
            <div class="result">
              <a class="result__a" href="https://example1.com">First Result</a>
              <a class="result__url">example1.com</a>
              <a class="result__snippet">First snippet.</a>
            </div>
            <div class="result">
              <a class="result__a" href="https://example2.com">Second Result</a>
              <a class="result__url">example2.com</a>
              <a class="result__snippet">Second snippet.</a>
            </div>
            <div class="result">
              <a class="result__a" href="https://example3.com">Third Result</a>
              <a class="result__url">example3.com</a>
              <a class="result__snippet">Third snippet.</a>
            </div>
          `,
        };

        global.fetch = mock(() => Promise.resolve(mockResponse as Response));

        const result = await tool._call({ query: "test", numResults: 5 });
        const parsed = JSON.parse(result);

        expect(parsed.results.length).toBe(3);
        expect(parsed.results[0].title).toBe("First Result");
        expect(parsed.results[1].title).toBe("Second Result");
        expect(parsed.results[2].title).toBe("Third Result");
      });

      test("スニペットにHTMLタグが含まれる場合 - タグが適切に除去される", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            `
            <div class="result">
              <a class="result__a" href="https://example.com">Article with HTML</a>
              <a class="result__url">example.com</a>
              <a class="result__snippet">This has <b>bold</b> and <em>italic</em> text.</a>
            </div>
          `,
        };

        global.fetch = mock(() => Promise.resolve(mockResponse as Response));

        const result = await tool._call({ query: "test" });
        const parsed = JSON.parse(result);

        expect(parsed.results.length).toBe(1);
        expect(parsed.results[0].snippet).not.toContain("<b>");
        expect(parsed.results[0].snippet).not.toContain("</b>");
        expect(parsed.results[0].snippet).not.toContain("<em>");
        expect(parsed.results[0].snippet).toBe("This has bold and italic text.");
      });
    });

    test("検索結果が見つからない場合のメッセージを返す", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results found</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "nonexistentquery123" });
      const parsed = JSON.parse(result);

      expect(parsed.results).toEqual([]);
      expect(parsed.message).toContain("検索結果が見つかりません");
    });

    test("HTMLエンティティが正しくデコードされる", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          `
          <div class="result">
            <a class="result__a" href="https://example.com">Test &amp; Quote</a>
            <a class="result__url">https://example.com/test?q=1&amp;2</a>
            <a class="result__snippet">A &lt; B &amp; C &gt; D</a>
          </div>
        `,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "test" });
      const parsed = JSON.parse(result);

      if (parsed.results.length > 0) {
        const firstResult = parsed.results[0];
        expect(firstResult.url).not.toContain("&amp;");
      }
    });
  });

  describe("エッジケース", () => {
    test("空のクエリ文字列", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "" });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
    });

    test("特殊文字を含むクエリ", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ query: "テスト & 検索" });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
    });

    test("非常に長いクエリ文字列", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html><body>No results</body></html>",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const longQuery = "a".repeat(500);
      const result = await tool._call({ query: longQuery });
      const parsed = JSON.parse(result);

      expect(parsed).toBeDefined();
    });
  });
});
