/**
 * 日時ツール
 *
 * 現在の日時や相対時間を取得します。
 * 記事の日付フォーマットや締め切り計算に使用します。
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 日時ツールの入力スキーマ
const dateTimeInputSchema = z.object({
  action: z.enum(["now", "format", "relative", "calculate"]).describe("実行するアクション"),
  format: z.string().optional().describe("日付フォーマット（例: YYYY-MM-DD）"),
  targetDate: z.string().optional().describe("対象の日付（ISO形式）"),
  days: z.number().optional().describe("加減算する日数"),
  timezone: z.string().optional().default("Asia/Tokyo").describe("タイムゾーン"),
});

/** 曜日の日本語名 */
const _WEEKDAYS_JA = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

/**
 * 日時ツール
 *
 * 外部ライブラリを使用せず、標準のDate APIとIntl.DateTimeFormatを使用します。
 */
export class DateTimeTool extends StructuredTool {
  name = "datetime";

  description =
    "現在の日時や相対時間を取得します。記事の日付フォーマットや締め切り計算に使用します。記事に日付情報を含める場合に使用してください。";

  // StructuredToolではZodオブジェクトスキーマを使用
  schema = dateTimeInputSchema;

  /**
   * 日時ツール実行
   *
   * @param input - 日時入力パラメータ
   * @returns 処理結果のJSON文字列
   */
  async _call(input: z.infer<typeof dateTimeInputSchema>): Promise<string> {
    const { action, timezone = "Asia/Tokyo" } = input;

    try {
      switch (action) {
        case "now":
          return this.getCurrentDateTime(timezone);
        case "format":
          return this.formatDateTime(input.targetDate, input.format, timezone);
        case "relative":
          return this.getRelativeTime(input.targetDate, timezone);
        case "calculate":
          return this.calculateDate(input.targetDate, input.days, timezone);
        default:
          return JSON.stringify(
            {
              error: `不明なアクション: ${action}`,
            },
            null,
            2,
          );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      return JSON.stringify(
        {
          error: `日時処理エラー: ${errorMessage}`,
        },
        null,
        2,
      );
    }
  }

  /**
   * 現在日時の取得
   *
   * @param timezone - タイムゾーン
   * @returns 現在日時情報のJSON
   */
  private getCurrentDateTime(timezone: string): string {
    const now = new Date();

    // ISO形式
    const iso = now.toISOString();

    // 日本語フォーマット用（曜日なし）
    const formatterDate = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 曜日用
    const formatterWeekday = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      weekday: "long",
    });

    const formatterShort = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // 各パーツを取得
    const partsShort = formatterShort.formatToParts(now);

    const yearShort = partsShort.find((p) => p.type === "year")?.value ?? "";
    const monthShort = partsShort.find((p) => p.type === "month")?.value ?? "";
    const dayShort = partsShort.find((p) => p.type === "day")?.value ?? "";

    // 日本語フォーマット（2024年2月24日）
    const formatted = formatterDate.format(now);

    // 短いフォーマット（2024-02-24）
    const formattedShort = `${yearShort}-${monthShort.padStart(2, "0")}-${dayShort.padStart(2, "0")}`;

    // 曜日
    const weekday = formatterWeekday.format(now);

    return JSON.stringify(
      {
        iso,
        formatted,
        formattedShort,
        weekday,
        timezone,
      },
      null,
      2,
    );
  }

  /**
   * 日時フォーマット
   *
   * @param targetDate - 対象日付（ISO形式）
   * @param format - フォーマット文字列
   * @param timezone - タイムゾーン
   * @returns フォーマット結果のJSON
   */
  private formatDateTime(
    targetDate: string | undefined,
    format: string | undefined,
    timezone: string,
  ): string {
    const date = targetDate ? new Date(targetDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return JSON.stringify(
        {
          error: "無効な日付形式です",
          targetDate,
        },
        null,
        2,
      );
    }

    if (!format) {
      // フォーマット指定がない場合はデフォルト形式
      const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return JSON.stringify(
        {
          targetDate: targetDate ?? "now",
          formatted: formatter.format(date),
          timezone,
        },
        null,
        2,
      );
    }

    // カスタムフォーマット処理
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partsMap = new Map(parts.map((p) => [p.type, p.value]));

    const year = partsMap.get("year") ?? "";
    const month = partsMap.get("month") ?? "";
    const day = partsMap.get("day") ?? "";
    const hour = partsMap.get("hour") ?? "";
    const minute = partsMap.get("minute") ?? "";
    const second = partsMap.get("second") ?? "";

    // 簡易フォーマット置換
    const formatted = format
      .replace(/YYYY/g, year)
      .replace(/YY/g, year.slice(-2))
      .replace(/MM/g, month)
      .replace(/M/g, String(Number(month)))
      .replace(/DD/g, day)
      .replace(/D/g, String(Number(day)))
      .replace(/HH/g, hour)
      .replace(/H/g, String(Number(hour)))
      .replace(/mm/g, minute)
      .replace(/m/g, String(Number(minute)))
      .replace(/ss/g, second)
      .replace(/s/g, String(Number(second)));

    return JSON.stringify(
      {
        targetDate: targetDate ?? "now",
        format,
        formatted,
        timezone,
      },
      null,
      2,
    );
  }

  /**
   * 相対時間の計算
   *
   * @param targetDate - 対象日付（ISO形式）
   * @param timezone - タイムゾーン
   * @returns 相対時間情報のJSON
   */
  private getRelativeTime(targetDate: string | undefined, timezone: string): string {
    if (!targetDate) {
      return JSON.stringify(
        {
          error: "targetDateが必要です",
        },
        null,
        2,
      );
    }

    const target = new Date(targetDate);
    if (Number.isNaN(target.getTime())) {
      return JSON.stringify(
        {
          error: "無効な日付形式です",
          targetDate,
        },
        null,
        2,
      );
    }

    const now = new Date();

    // タイムゾーンを考慮した日付のみの比較
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // 日付部分のみの文字列を取得して比較
    const _nowDateStr = formatter.format(now).replace(/\//g, "-");
    const targetDateStr = formatter.format(target).replace(/\//g, "-");

    // 日数差を計算（ミリ秒 → 日）
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let description: string;
    if (diffDays === 0) {
      description = "今日";
    } else if (diffDays > 0) {
      description = `${diffDays}日後`;
    } else {
      description = `${Math.abs(diffDays)}日前`;
    }

    return JSON.stringify(
      {
        targetDate: targetDateStr,
        relativeDays: diffDays,
        description,
        timezone,
      },
      null,
      2,
    );
  }

  /**
   * 日付の加減算
   *
   * @param targetDate - 対象日付（ISO形式）、省略時は現在日時
   * @param days - 加減算する日数
   * @param timezone - タイムゾーン
   * @returns 計算結果のJSON
   */
  private calculateDate(
    targetDate: string | undefined,
    days: number | undefined,
    timezone: string,
  ): string {
    if (days === undefined) {
      return JSON.stringify(
        {
          error: "daysパラメータが必要です",
        },
        null,
        2,
      );
    }

    const baseDate = targetDate ? new Date(targetDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      return JSON.stringify(
        {
          error: "無効な日付形式です",
          targetDate,
        },
        null,
        2,
      );
    }

    // 日数を加減算
    const resultDate = new Date(baseDate);
    resultDate.setDate(resultDate.getDate() + days);

    // フォーマット
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const fromDateStr = formatter.format(baseDate).replace(/\//g, "-");
    const resultDateStr = formatter.format(resultDate).replace(/\//g, "-");

    let description: string;
    if (days === 0) {
      description = "同じ日";
    } else if (days > 0) {
      description = `${days}日後`;
    } else {
      description = `${Math.abs(days)}日前`;
    }

    return JSON.stringify(
      {
        fromDate: fromDateStr,
        days,
        resultDate: resultDateStr,
        description,
        timezone,
      },
      null,
      2,
    );
  }
}

/**
 * DateTimeToolのシングルトンインスタンス
 */
export const dateTimeTool = new DateTimeTool();
