/**
 * テキスト統計ツールのテスト
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { TextStatsTool } from "@/tools/text-stats.js";

describe("TextStatsTool", () => {
  let tool: TextStatsTool;

  beforeEach(() => {
    tool = new TextStatsTool();
  });

  describe("ツール定義", () => {
    test("nameプロパティが正しく設定されている", () => {
      expect(tool.name).toBe("text_stats");
    });

    test("descriptionプロパティが設定されている", () => {
      expect(tool.description).toContain("統計情報");
      expect(tool.description).toContain("文字数");
      expect(tool.description).toContain("読了時間");
    });

    test("schemaが正しく定義されている", () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();

      // テキストのみでパースできる
      const simpleResult = schema.safeParse({ text: "テストテキスト" });
      expect(simpleResult.success).toBe(true);

      // includeDetails付きでもパースできる
      const withDetails = schema.safeParse({
        text: "テストテキスト",
        includeDetails: false,
      });
      expect(withDetails.success).toBe(true);
    });

    test("textパラメータが必須", () => {
      const schema = tool.schema;
      const missingText = schema.safeParse({});
      expect(missingText.success).toBe(false);
    });
  });

  describe("_callメソッド - 文字数カウント", () => {
    test("基本的な文字数をカウントできる", async () => {
      const result = await tool._call({ text: "これはテストです。" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount).toBeDefined();
      expect(parsed.characterCount.total).toBe(9); // 句点を含む
      expect(parsed.characterCount.withoutSpaces).toBe(9);
    });

    test("空白を除いた文字数を正しくカウント", async () => {
      const result = await tool._call({ text: "これは テスト です。" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.total).toBe(11); // スペース2個を含む
      expect(parsed.characterCount.withoutSpaces).toBe(9);
    });

    test("日本語文字のみをカウント", async () => {
      const result = await tool._call({ text: "Hello世界123テスト" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.total).toBe(13);
      expect(parsed.characterCount.japaneseOnly).toBe(5); // 世, 界, テ, ス, ト
    });

    test("改行を含むテキストの文字数", async () => {
      const result = await tool._call({ text: "一行目\n二行目\n三行目" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.total).toBe(11); // 改行を含む
    });
  });

  describe("_callメソッド - 読了時間", () => {
    test("読了時間を計算できる", async () => {
      // 500文字のテキスト = 1分
      const text = "あ".repeat(500);
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.readingTime).toBeDefined();
      expect(parsed.readingTime.minutes).toBe(1);
      expect(parsed.readingTime.formatted).toBe("約1分");
    });

    test("短いテキストの読了時間", async () => {
      const result = await tool._call({ text: "短いテキストです。" });
      const parsed = JSON.parse(result);

      expect(parsed.readingTime.minutes).toBe(0);
      expect(parsed.readingTime.formatted).toBe("約0分");
    });

    test("長いテキストの読了時間", async () => {
      // 2500文字 = 5分
      const text = "あ".repeat(2500);
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.readingTime.minutes).toBe(5);
      expect(parsed.readingTime.formatted).toBe("約5分");
    });

    test("秒の繰り上げが正しい", async () => {
      // 400文字 = 0分48秒 → 約1分
      const text = "あ".repeat(400);
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.readingTime.seconds).toBe(48);
      expect(parsed.readingTime.formatted).toBe("約1分"); // 繰り上げ
    });
  });

  describe("_callメソッド - 構造分析", () => {
    test("見出しを検出できる", async () => {
      const text = `# タイトル
## セクション1
### サブセクション
内容`;
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.structure.headings.h1).toBe(1);
      expect(parsed.structure.headings.h2).toBe(1);
      expect(parsed.structure.headings.h3).toBe(1);
      expect(parsed.structure.headings.total).toBe(3);
    });

    test("段落数をカウントできる", async () => {
      const text = `第一段落です。

第二段落です。

第三段落です。`;
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.structure.paragraphs).toBe(3);
    });

    test("文数をカウントできる", async () => {
      const result = await tool._call({ text: "文1。文2。文3！" });
      const parsed = JSON.parse(result);

      expect(parsed.structure.sentences).toBe(3);
    });

    test("すべての見出しレベルを検出", async () => {
      const text = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.structure.headings.h1).toBe(1);
      expect(parsed.structure.headings.h2).toBe(1);
      expect(parsed.structure.headings.h3).toBe(1);
      expect(parsed.structure.headings.h4).toBe(1);
      expect(parsed.structure.headings.h5).toBe(1);
      expect(parsed.structure.headings.h6).toBe(1);
      expect(parsed.structure.headings.total).toBe(6);
    });
  });

  describe("_callメソッド - 品質評価", () => {
    test("見出しがない場合の推奨", async () => {
      const result = await tool._call({ text: "本文のみ。見出しなし。" });
      const parsed = JSON.parse(result);

      expect(parsed.quality.headingDensity).toBe("none");
      expect(parsed.quality.recommendation).toContain("見出しを追加");
    });

    test("見出しが適切な場合の推奨", async () => {
      const text = `# タイトル

${"本文です。".repeat(50)}

## セクション1

${"続きです。".repeat(50)}`;
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.quality.headingDensity).toBe("good");
      expect(parsed.quality.recommendation).toContain("バランスが良好");
    });

    test("平均文長を計算できる", async () => {
      const result = await tool._call({ text: "短い。少し長めの文です。もっと長い文章の例です。" });
      const parsed = JSON.parse(result);

      expect(parsed.quality.avgSentenceLength).toBeGreaterThan(0);
    });
  });

  describe("_callメソッド - 詳細オプション", () => {
    test("includeDetails=falseで簡易形式を返す", async () => {
      const result = await tool._call({
        text: "テストテキストです。",
        includeDetails: false,
      });
      const parsed = JSON.parse(result);

      expect(parsed.totalCharacters).toBeDefined();
      expect(parsed.readingTimeFormatted).toBeDefined();
      expect(parsed.totalHeadings).toBeDefined();
      expect(parsed.paragraphs).toBeDefined();
      expect(parsed.characterCount).toBeUndefined();
    });

    test("includeDetails=true（デフォルト）で詳細形式を返す", async () => {
      const result = await tool._call({
        text: "テストテキストです。",
      });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount).toBeDefined();
      expect(parsed.readingTime).toBeDefined();
      expect(parsed.structure).toBeDefined();
      expect(parsed.quality).toBeDefined();
    });
  });

  describe("エッジケース", () => {
    test("空文字を処理できる", async () => {
      const result = await tool._call({ text: "" });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("テキストが空");
      expect(parsed.characterCount.total).toBe(0);
    });

    test("空白のみのテキストを処理できる", async () => {
      const result = await tool._call({ text: "   \n\t  " });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("テキストが空");
    });

    test("非常に長いテキストを処理できる", async () => {
      const text = "あ".repeat(10000);
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.total).toBe(10000);
      expect(parsed.readingTime.minutes).toBe(20);
    });

    test("特殊文字を含むテキスト", async () => {
      const result = await tool._call({ text: "特殊文字: <>&\"'©®™" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount).toBeDefined();
      expect(parsed.error).toBeUndefined();
    });

    test("コードブロックを含むテキスト", async () => {
      const text = `# タイトル

\`\`\`javascript
const x = 1;
\`\`\`

本文です。`;
      const result = await tool._call({ text });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount).toBeDefined();
      expect(parsed.structure.headings.total).toBe(1);
    });
  });

  describe("日本語テキストの処理", () => {
    test("ひらがなのみのテキスト", async () => {
      const result = await tool._call({ text: "これはひらがなのてすとです" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.japaneseOnly).toBe(parsed.characterCount.withoutSpaces);
    });

    test("カタカナのみのテキスト", async () => {
      const result = await tool._call({ text: "コレハカタカナノテストデス" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.japaneseOnly).toBe(parsed.characterCount.withoutSpaces);
    });

    test("漢字を含むテキスト", async () => {
      const result = await tool._call({ text: "日本語の文章です。" });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.japaneseOnly).toBe(8);
    });

    test("混在テキスト", async () => {
      const result = await tool._call({
        text: "Japanese 日本語、English、数字123、記号！",
      });
      const parsed = JSON.parse(result);

      expect(parsed.characterCount.japaneseOnly).toBeGreaterThan(0);
      expect(parsed.characterCount.japaneseOnly).toBeLessThan(parsed.characterCount.total);
    });
  });
});
