import "dotenv/config";
import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { getEnv, validateEnv } from "@/env.js";
import { AgentError } from "@/errors/index.js";
import { buildGraph } from "@/graph.js";
import { logger } from "@/logger.js";
import { formatContent, type OutputFormat } from "@/utils/formatters.js";

// 起動時に環境変数をバリデーション
try {
  validateEnv();
} catch {
  process.exit(1);
}

const program = new Command();

program
  .name("mikan-press")
  .description("LangChain.js + LangGraph.js による記事執筆AIエージェント")
  .version("0.1.0");

program
  .command("generate")
  .description("記事を生成する")
  .requiredOption("-t, --topic <topic>", "記事のトピック")
  .option("-r, --max-reviews <number>", "最大レビュー回数")
  .option("--max-retries-per-agent <number>", "各エージェントの最大やり直し回数")
  .option("--skip-research", "リサーチフェーズをスキップ")
  .option("-o, --output <path>", "出力ファイルパス")
  .option("-f, --format <format>", "出力フォーマット (markdown|html|json|text)", "markdown")
  .action(
    async (options: {
      topic: string;
      maxReviews?: string;
      maxRetriesPerAgent?: string;
      skipResearch?: boolean;
      output?: string;
      format?: string;
    }) => {
      const { topic, maxReviews, maxRetriesPerAgent, skipResearch, output, format } = options;

      // 出力フォーマットのバリデーション
      const validFormats: OutputFormat[] = ["markdown", "html", "json", "text"];
      if (!format || !validFormats.includes(format as OutputFormat)) {
        logger.error(`無効なフォーマットです: ${format}`);
        logger.error(`有効なフォーマット: ${validFormats.join(", ")}`);
        process.exit(1);
      }
      const outputFormat = format as OutputFormat;

      // 環境変数からデフォルト値を取得（CLI > 環境変数 > デフォルト値の優先順位）
      const env = getEnv();
      const finalMaxReviews =
        maxReviews !== undefined ? Number.parseInt(maxReviews, 10) : env.MAX_REVIEWS;
      const finalMaxRetriesPerAgent =
        maxRetriesPerAgent !== undefined
          ? Number.parseInt(maxRetriesPerAgent, 10)
          : env.MAX_RETRIES_PER_AGENT;

      logger.info(`\n📝 記事生成を開始します`);
      logger.info(`   トピック: ${topic}`);
      logger.info(`   最大レビュー回数: ${finalMaxReviews}`);
      logger.info(`   各エージェント最大やり直し: ${finalMaxRetriesPerAgent}回`);
      if (skipResearch) logger.info(`   リサーチ: スキップ`);
      logger.info("");

      const graph = buildGraph();

      try {
        const result = await graph.invoke({
          topic,
          maxReviews: finalMaxReviews,
          maxRetriesPerAgent: finalMaxRetriesPerAgent,
          skipResearch: !!skipResearch,
          reviewCount: 0,
          research: "",
          outline: "",
          draft: "",
          editedDraft: "",
          review: "",
          finalArticle: "",
          status: "researching" as const,
          needRetry: false,
          researcherRetryCount: 0,
          plannerRetryCount: 0,
          writerRetryCount: 0,
          editorRetryCount: 0,
        });

        logger.info("\n✅ 記事生成が完了しました\n");
        logger.info(`   出力フォーマット: ${outputFormat}`);

        // 指定されたフォーマットに変換
        const formattedContent = formatContent(result.finalArticle, outputFormat);

        if (output) {
          writeFileSync(output, formattedContent, "utf-8");
          logger.info(`📄 出力先: ${output}\n`);
        } else {
          console.log("---\n");
          console.log(formattedContent);
          console.log("\n---");
        }
      } catch (error) {
        handleCliError(error);
        process.exit(1);
      }
    },
  );

/**
 * CLIエラーハンドリング関数
 *
 * エラー種別に応じたユーザーフレンドリーなメッセージを表示します。
 */
function handleCliError(error: unknown): void {
  if (error instanceof AgentError) {
    // AgentError の場合は詳細情報を表示
    logger.error("記事生成中にエラーが発生しました", error);
  } else if (error instanceof Error) {
    // 一般的な Error の場合、ユーザーフレンドリーなメッセージに変換
    const message = getFriendlyErrorMessage(error);
    logger.error(message);
  } else {
    logger.error("予期しないエラーが発生しました");
  }
}

/**
 * 一般的なエラーからユーザーフレンドリーなメッセージを生成
 */
function getFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // APIキーエラー
  if (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("invalid api key")
  ) {
    return "APIキーが無効です。.env の設定を確認してください";
  }

  // レート制限
  if (message.includes("rate limit") || message.includes("429")) {
    return "APIのレート制限に達しました。時間を置いて再実行してください";
  }

  // ネットワークエラー
  if (
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("fetch failed")
  ) {
    return "ネットワーク接続を確認してください";
  }

  // タイムアウト
  if (message.includes("timeout") || message.includes("etimedout")) {
    return "リクエストがタイムアウトしました。時間を置いて再実行してください";
  }

  // その他
  return `エラーが発生しました: ${error.message}`;
}

program.parse();
