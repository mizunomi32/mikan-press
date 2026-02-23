/**
 * Web取得ツールのテスト
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import { WebFetchTool } from "@/tools/fetch.js";

describe("WebFetchTool", () => {
  let tool: WebFetchTool;

  beforeEach(() => {
    tool = new WebFetchTool();
  });

  describe("ツール定義", () => {
    test("nameプロパティが正しく設定されている", () => {
      expect(tool.name).toBe("web_fetch");
    });

    test("descriptionプロパティが設定されている", () => {
      expect(tool.description).toContain("URL");
      expect(tool.description).toContain("本文テキスト");
    });

    test("schemaが正しく定義されている", () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();

      // オブジェクトとしてパースできる
      const objectResult = schema.safeParse({ url: "https://example.com" });
      expect(objectResult.success).toBe(true);

      // オプションパラメータ付きでもパースできる
      const withMaxLength = schema.safeParse({ url: "https://example.com", maxLength: 3000 });
      expect(withMaxLength.success).toBe(true);
    });

    test("無効なURLはスキーマ検証で弾かれる", () => {
      const schema = tool.schema;
      const invalidUrl = schema.safeParse({ url: "not-a-url" });
      expect(invalidUrl.success).toBe(false);
    });
  });

  describe("_callメソッド - 正常系", () => {
    test("有効なURLからコンテンツを取得できる", async () => {
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>This is a test content for the article.</p>
            </article>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.url).toBe("https://example.com");
      expect(parsed.title).toBe("Test Page");
      expect(parsed.content).toContain("Test Article");
      expect(parsed.contentLength).toBeGreaterThan(0);
    });

    test("maxLengthで文字数制限が適用される", async () => {
      const longContent = "a".repeat(10000);
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body><article>${longContent}</article></body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com", maxLength: 100 });
      const parsed = JSON.parse(result);

      expect(parsed.truncated).toBe(true);
      expect(parsed.content.length).toBeLessThanOrEqual(101); // 句点を含む
    });

    test("日本語ページを正しく処理できる", async () => {
      const mockHtml = `
        <html>
          <head><title>テストページ</title></head>
          <body>
            <article>
              <h1>日本語の記事</h1>
              <p>これは日本語のテストコンテンツです。</p>
            </article>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.jp" });
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("テストページ");
      expect(parsed.content).toContain("日本語の記事");
    });
  });

  describe("_callメソッド - 異常系", () => {
    test("404エラー時にエラーメッセージを返す", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com/notfound" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("404");
      expect(parsed.content).toBe("");
    });

    test("タイムアウト時にエラーメッセージを返す", async () => {
      const abortError = new Error("Request timeout");
      abortError.name = "AbortError";

      global.fetch = mock(() => Promise.reject(abortError));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("タイムアウト");
    });

    test("HTML以外のContent-Typeでエラーメッセージを返す", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/pdf" }),
        text: async () => "PDF content",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com/doc.pdf" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("HTML以外");
    });

    test("ネットワークエラー時にエラーメッセージを返す", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error")));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("ネットワークエラー");
    });

    test("その他のHTTPエラー時にエラーメッセージを返す", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("HTTPエラー");
      expect(parsed.error).toContain("500");
    });
  });

  describe("パース処理", () => {
    test("scriptタグが除去される", async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <script>console.log('should be removed');</script>
            <article>Valid content here.</article>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.content).not.toContain("console.log");
      expect(parsed.content).toContain("Valid content");
    });

    test("styleタグが除去される", async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test</title>
            <style>.class { color: red; }</style>
          </head>
          <body><article>Content only.</article></body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.content).not.toContain("color: red");
    });

    test("HTMLエンティティがデコードされる", async () => {
      const mockHtml = `
        <html>
          <head><title>Test &amp; Demo</title></head>
          <body>
            <article>
              <p>&lt;tag&gt; &amp; &quot;quoted&quot;</p>
            </article>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Test & Demo");
      expect(parsed.content).toContain("<tag>");
      expect(parsed.content).toContain("&");
    });

    test("articleタグが優先的に抽出される", async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <nav>Navigation content</nav>
            <article>Main article content</article>
            <footer>Footer content</footer>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.content).toContain("Main article content");
      expect(parsed.content).not.toContain("Navigation content");
    });

    test("mainタグがarticleがない場合に抽出される", async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <nav>Navigation</nav>
            <main>Main content area</main>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.content).toContain("Main content area");
    });

    test("HTMLコメントが除去される", async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <!-- This is a comment -->
            <article>Article content</article>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      };

      global.fetch = mock(() => Promise.resolve(mockResponse as Response));

      const result = await tool._call({ url: "https://example.com" });
      const parsed = JSON.parse(result);

      expect(parsed.content).not.toContain("This is a comment");
    });
  });
});
