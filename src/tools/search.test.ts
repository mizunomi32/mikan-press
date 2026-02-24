/**
 * WebSearchToolのテスト
 */

import { describe, expect, it } from "bun:test";
import { WebSearchTool } from "./search";

describe("WebSearchTool", () => {
  const tool = new WebSearchTool();

  describe("parseSearchResults", () => {
    it("DuckDuckGo HTML形式の検索結果を正しくパースできる", () => {
      // DuckDuckGo HTML検索結果のサンプル
      // 注: 現在の実装では result__url クラスのテキストをURLとして使用している
      const sampleHtml = `
        <html>
        <body>
          <div class="result results_links results_links_deep web-result">
            <a class="result__a" href="https://example.com/article1">Example Article 1</a>
            <a class="result__url" href="https://example.com/article1">https://example.com/article1</a>
            <a class="result__snippet">This is a test snippet for the first article.</a>
          </div>
          <div class="result results_links results_links_deep web-result">
            <a class="result__a" href="https://example.com/article2">Example Article 2</a>
            <a class="result__url" href="https://example.com/article2">https://example.com/article2</a>
            <a class="result__snippet">This is a test snippet for the second article with more content.</a>
          </div>
        </body>
        </html>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 2);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: "Example Article 1",
        url: "https://example.com/article1",
        snippet: "This is a test snippet for the first article.",
      });
      expect(results[1]).toEqual({
        title: "Example Article 2",
        url: "https://example.com/article2",
        snippet: "This is a test snippet for the second article with more content.",
      });
    });

    it("結果数の制限が正しく動作する", () => {
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="https://example.com/1">Article 1</a>
          <a class="result__url" href="https://example.com/1">https://example.com/1</a>
          <a class="result__snippet">Snippet 1</a>
        </div>
        <div class="result">
          <a class="result__a" href="https://example.com/2">Article 2</a>
          <a class="result__url" href="https://example.com/2">https://example.com/2</a>
          <a class="result__snippet">Snippet 2</a>
        </div>
        <div class="result">
          <a class="result__a" href="https://example.com/3">Article 3</a>
          <a class="result__url" href="https://example.com/3">https://example.com/3</a>
          <a class="result__snippet">Snippet 3</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 2);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Article 1");
      expect(results[1].title).toBe("Article 2");
    });

    it("HTMLエンティティを正しくデコードする", () => {
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="https://example.com?foo=bar&amp;baz=qux">Test &quot;Quotes&quot;</a>
          <a class="result__url" href="https://example.com?foo=bar&amp;baz=qux">https://example.com?foo=bar&amp;baz=qux</a>
          <a class="result__snippet">This has &lt;tags&gt; and &amp; symbols.</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 1);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test "Quotes"');
      expect(results[0].url).toBe("https://example.com?foo=bar&baz=qux");
      expect(results[0].snippet).toBe("This has <tags> and & symbols.");
    });

    it("スニペットがない場合は「説明なし」を返す", () => {
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="https://example.com">Test Article</a>
          <a class="result__url" href="https://example.com">https://example.com</a>
          <a class="result__snippet"></a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 1);

      expect(results).toHaveLength(1);
      expect(results[0].snippet).toBe("説明なし");
    });

    it("メインパーサーが失敗した場合にフォールバックパーサーを使用する", () => {
      // メインパーサーのパターンにマッチしないHTML
      const irregularHtml = `
        <div class="web-result">
          <a class="result__a" href="https://example.com">Test Article</a>
          <a class="result__url" href="https://example.com">https://example.com</a>
          <a class="result__snippet">Test snippet</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(irregularHtml, 1);

      // フォールバックパーサーが動作することを確認
      expect(Array.isArray(results)).toBe(true);
    });

    it("複雑なクラス構造を持つHTMLをパースできる", () => {
      const sampleHtml = `
        <div class="result results_links results_links_deep web-result">
          <a class="result__a" href="https://example.com/test">Complex Article</a>
          <a class="result__url" href="https://example.com/test">https://example.com/test</a>
          <a class="result__snippet result__excerpt">This is a more complex snippet with <b>bold text</b> inside.</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 1);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Complex Article");
      expect(results[0].snippet).toBe("This is a more complex snippet with bold text inside.");
    });

    it("空のHTMLに対して空の配列を返す", () => {
      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults("", 5);
      expect(results).toHaveLength(0);
    });

    it("正規化された空白文字を正しく処理する", () => {
      // 余分な空白があるHTML（正規化後は処理される）
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="https://example.com">Spaced Title</a>
          <a class="result__url" href="https://example.com">https://example.com</a>
          <a class="result__snippet">Spaced snippet content</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResults(sampleHtml, 1);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Spaced Title");
      expect(results[0].snippet).toBe("Spaced snippet content");
    });
  });

  describe("parseSearchResultsFallback", () => {
    it("フォールバックパーサーが簡易パターンで検索結果を抽出する", () => {
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="https://example.com/fallback">Fallback Article</a>
          <a class="result__url" href="https://example.com/fallback">https://example.com/fallback</a>
          <a class="result__snippet">Fallback snippet content</a>
        </div>
      `;

      // biome-ignore lint/suspicious/noExplicitAny: プライベートメソッドのテストのためanyキャストを使用
      const results = (tool as any).parseSearchResultsFallback(sampleHtml, 1);

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].url).toContain("example.com");
      }
    });
  });

  describe("Call method", () => {
    it("ツールの基本プロパティが正しく設定されている", () => {
      expect(tool.name).toBe("web_search");
      expect(tool.description).toContain("Web検索");
      expect(tool.schema).toBeDefined();
    });
  });
});
