/**
 * テキスト統計ツール
 *
 * テキストの統計情報（文字数、読了時間、見出し数など）を計算します。
 * 記事の長さや構造を分析する場合に使用します。
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// テキスト統計ツールの入力スキーマ
const textStatsInputSchema = z.object({
  text: z.string().describe("分析するテキスト"),
  includeDetails: z.boolean().optional().default(true).describe("詳細な統計を含めるか"),
});

/** 日本語の読了速度（文字/分） */
const JAPANESE_READING_SPEED = 500;

/**
 * テキスト統計ツール
 *
 * 外部ライブラリを使用せず、標準のString/RegExp APIを使用します。
 */
export class TextStatsTool extends StructuredTool {
  name = "text_stats";

  description =
    "テキストの統計情報（文字数、読了時間、見出し数など）を計算します。記事の長さや構造を分析する場合に使用してください。";

  // StructuredToolではZodオブジェクトスキーマを使用
  schema = textStatsInputSchema;

  /**
   * テキスト統計ツール実行
   *
   * @param input - テキスト統計入力パラメータ
   * @returns 処理結果のJSON文字列
   */
  async _call(input: z.infer<typeof textStatsInputSchema>): Promise<string> {
    const { text, includeDetails = true } = input;

    try {
      // 空文字のチェック
      if (!text || text.trim().length === 0) {
        return JSON.stringify(
          {
            error: "テキストが空です",
            characterCount: { total: 0, withoutSpaces: 0, japaneseOnly: 0 },
            readingTime: { minutes: 0, seconds: 0, formatted: "約0分" },
            structure: { headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: 0 }, paragraphs: 0, sentences: 0 },
            quality: { avgSentenceLength: 0, headingDensity: "none", recommendation: "テキストがありません" },
          },
          null,
          2,
        );
      }

      const characterCount = this.calculateCharacterCount(text);
      const readingTime = this.calculateReadingTime(characterCount.japaneseOnly || characterCount.withoutSpaces);
      const structure = this.analyzeStructure(text);
      const quality = this.evaluateQuality(characterCount, structure);

      const result = {
        characterCount,
        readingTime,
        structure,
        quality,
      };

      // 詳細情報を含めない場合はシンプルな形式
      if (!includeDetails) {
        return JSON.stringify(
          {
            totalCharacters: characterCount.total,
            readingTimeFormatted: readingTime.formatted,
            totalHeadings: structure.headings.total,
            paragraphs: structure.paragraphs,
          },
          null,
          2,
        );
      }

      return JSON.stringify(result, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      return JSON.stringify(
        {
          error: `テキスト統計エラー: ${errorMessage}`,
        },
        null,
        2,
      );
    }
  }

  /**
   * 文字数カウント
   *
   * @param text - 分析するテキスト
   * @returns 文字数情報
   */
  private calculateCharacterCount(text: string): {
    total: number;
    withoutSpaces: number;
    japaneseOnly: number;
  } {
    // 全文字数
    const total = text.length;

    // 空白を除いた文字数
    const withoutSpaces = text.replace(/\s/g, "").length;

    // 日本語文字のみ（ひらがな、カタカナ、漢字）
    const japaneseChars = text.match(/[\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Han}]/gu);
    const japaneseOnly = japaneseChars ? japaneseChars.length : 0;

    return {
      total,
      withoutSpaces,
      japaneseOnly,
    };
  }

  /**
   * 読了時間の計算
   *
   * @param characterCount - 文字数
   * @returns 読了時間情報
   */
  private calculateReadingTime(characterCount: number): {
    minutes: number;
    seconds: number;
    formatted: string;
  } {
    // 総読了時間（分）
    const totalMinutes = characterCount / JAPANESE_READING_SPEED;
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.round((totalMinutes - minutes) * 60);

    // フォーマット（秒を繰り上げて「約N分」形式）
    const roundedMinutes = seconds >= 30 ? minutes + 1 : minutes;
    const formatted = `約${roundedMinutes}分`;

    return {
      minutes,
      seconds,
      formatted,
    };
  }

  /**
   * 構造分析
   *
   * @param text - 分析するテキスト
   * @returns 構造情報
   */
  private analyzeStructure(text: string): {
    headings: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      total: number;
    };
    paragraphs: number;
    sentences: number;
  } {
    // 見出しの検出
    const lines = text.split("\n");
    let h1 = 0,
      h2 = 0,
      h3 = 0,
      h4 = 0,
      h5 = 0,
      h6 = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("###### ")) {
        h6++;
      } else if (trimmed.startsWith("##### ")) {
        h5++;
      } else if (trimmed.startsWith("#### ")) {
        h4++;
      } else if (trimmed.startsWith("### ")) {
        h3++;
      } else if (trimmed.startsWith("## ")) {
        h2++;
      } else if (trimmed.startsWith("# ")) {
        h1++;
      }
    }

    const headings = { h1, h2, h3, h4, h5, h6, total: h1 + h2 + h3 + h4 + h5 + h6 };

    // 段落数（空行で区切られたブロック）
    const paragraphBlocks = text.split(/\n\s*\n/).filter((block) => block.trim().length > 0);
    const paragraphs = paragraphBlocks.length;

    // 文数（句点で区切る）
    const sentences = this.countSentences(text);

    return {
      headings,
      paragraphs,
      sentences,
    };
  }

  /**
   * 文の数をカウント
   *
   * @param text - 分析するテキスト
   * @returns 文の数
   */
  private countSentences(text: string): number {
    // 句点（。）で区切る
    const sentences = text.match(/[。！？]/g);
    return sentences ? sentences.length : 0;
  }

  /**
   * 品質評価
   *
   * @param characterCount - 文字数情報
   * @param structure - 構造情報
   * @returns 品質評価情報
   */
  private evaluateQuality(
    characterCount: { total: number; withoutSpaces: number; japaneseOnly: number },
    structure: { headings: { total: number }; paragraphs: number; sentences: number },
  ): {
    avgSentenceLength: number;
    headingDensity: "none" | "sparse" | "good" | "dense";
    recommendation: string;
  } {
    // 平均文長（文字数 / 文数）
    const avgSentenceLength = structure.sentences > 0 ? Math.round(characterCount.withoutSpaces / structure.sentences) : 0;

    // 見出し密度（見出し1つあたりの文字数）
    const charsPerHeading = structure.headings.total > 0 ? Math.round(characterCount.withoutSpaces / structure.headings.total) : Infinity;

    let headingDensity: "none" | "sparse" | "good" | "dense";
    let recommendation: string;

    if (structure.headings.total === 0) {
      headingDensity = "none";
      recommendation = "見出しを追加して記事の構造を整理することを推奨します";
    } else if (charsPerHeading > 1000) {
      headingDensity = "sparse";
      recommendation = "見出しを増やして、読者が情報を見つけやすくすることを推奨します";
    } else if (charsPerHeading < 200) {
      headingDensity = "dense";
      recommendation = "見出しが多すぎる可能性があります。関連するセクションを統合することを検討してください";
    } else {
      headingDensity = "good";
      recommendation = "見出しのバランスが良好です";
    }

    // 文長に関する追加の推奨事項
    if (avgSentenceLength > 60) {
      recommendation += "。また、文が長すぎる傾向があります。短く区切ることを検討してください";
    } else if (avgSentenceLength > 0 && avgSentenceLength < 15) {
      recommendation += "。また、文が短すぎる傾向があります。内容を充実させることを検討してください";
    }

    return {
      avgSentenceLength,
      headingDensity,
      recommendation,
    };
  }
}

/**
 * TextStatsToolのシングルトンインスタンス
 */
export const textStatsTool = new TextStatsTool();
