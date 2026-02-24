/**
 * formatters.ts のテスト
 *
 * 出力フォーマット変換機能を検証します。
 */

import { describe, expect, test } from "bun:test";
import {
  formatContent,
  toHtml,
  toJson,
  toMarkdown,
  toPlainText,
} from "../../src/utils/formatters.js";

const _sampleMarkdown = `# サンプル記事

これはサンプルの記事です。

## はじめに

AIエージェントについて説明します。

- 特徴1
- 特徴2

## おわりに

以上です。`;

describe("formatters.ts", () => {
  describe("toMarkdown", () => {
    test("Markdownをそのまま返す", () => {
      const input = "# Hello\n\nThis is a **bold** text.";
      const result = toMarkdown(input);
      expect(result).toBe(input);
    });
  });

  describe("toHtml", () => {
    test("見出しを変換する", () => {
      const input = "# H1\n## H2\n### H3";
      const result = toHtml(input);
      expect(result).toContain("<h1>H1</h1>");
      expect(result).toContain("<h2>H2</h2>");
      expect(result).toContain("<h3>H3</h3>");
    });

    test("太字を変換する", () => {
      const input = "This is **bold** text.";
      const result = toHtml(input);
      expect(result).toContain("<strong>bold</strong>");
    });

    test("斜体を変換する", () => {
      const input = "This is *italic* text.";
      const result = toHtml(input);
      expect(result).toContain("<em>italic</em>");
    });

    test("HTML構造を持つ", () => {
      const result = toHtml("# Test");
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html");
      expect(result).toContain("<body>");
      expect(result).toContain("</body>");
      expect(result).toContain("</html>");
    });
  });

  describe("toJson", () => {
    test("JSON形式で出力する", () => {
      const input = "# Hello\n\nThis is content.";
      const result = toJson(input);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty("format", "markdown");
      expect(parsed).toHaveProperty("generatedAt");
      expect(parsed).toHaveProperty("sections");
      expect(Array.isArray(parsed.sections)).toBe(true);
    });

    test("見出しをセクションとして認識する", () => {
      const input = "# Title\n\nContent.";
      const result = toJson(input);
      const parsed = JSON.parse(result);

      const headingSection = parsed.sections.find((s: { type: string }) => s.type === "heading");
      expect(headingSection).toBeDefined();
      expect(headingSection.content).toBe("Title");
      expect(headingSection.level).toBe(1);
    });

    test("段落をセクションとして認識する", () => {
      const input = "This is a paragraph.";
      const result = toJson(input);
      const parsed = JSON.parse(result);

      const paragraphSection = parsed.sections.find((s: { type: string }) => s.type === "paragraph");
      expect(paragraphSection).toBeDefined();
      expect(paragraphSection.content).toBe("This is a paragraph.");
    });
  });

  describe("toPlainText", () => {
    test("見出し記号を削除する", () => {
      const input = "# Title\n## Subtitle";
      const result = toPlainText(input);
      expect(result).not.toContain("# Title");
      expect(result).toContain("Title");
      expect(result).toContain("Subtitle");
    });

    test("太字記号を削除する", () => {
      const input = "This is **bold** text.";
      const result = toPlainText(input);
      expect(result).not.toContain("**");
      expect(result).toContain("bold");
    });

    test("斜体記号を削除する", () => {
      const input = "This is *italic* text.";
      const result = toPlainText(input);
      expect(result).not.toContain("*");
      expect(result).toContain("italic");
    });

    test("コード記号を削除する", () => {
      const input = "This is `code` text.";
      const result = toPlainText(input);
      expect(result).not.toContain("`");
      expect(result).toContain("code");
    });

    test("リンク記号を変換する", () => {
      const input = "[Example](https://example.com)";
      const result = toPlainText(input);
      expect(result).toContain("Example");
      expect(result).toContain("https://example.com");
    });
  });

  describe("formatContent", () => {
    test("markdown フォーマットを返す", () => {
      const input = "# Test";
      const result = formatContent(input, "markdown");
      expect(result).toBe(input);
    });

    test("html フォーマットを返す", () => {
      const input = "# Test";
      const result = formatContent(input, "html");
      expect(result).toContain("<h1>Test</h1>");
    });

    test("json フォーマットを返す", () => {
      const input = "# Test";
      const result = formatContent(input, "json");
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty("format");
    });

    test("text フォーマットを返す", () => {
      const input = "# Test **Bold**";
      const result = formatContent(input, "text");
      expect(result).toContain("Test");
      expect(result).toContain("Bold");
      expect(result).not.toContain("**");
    });

    test("無効なフォーマットでエラーを投げる", () => {
      const input = "# Test";
      // @ts-expect-error - エラーテストのため意図的に無効な値を渡す
      expect(() => formatContent(input, "invalid")).toThrow();
    });
  });
});
