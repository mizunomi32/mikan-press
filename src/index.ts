import { Command } from "commander";
import { buildGraph } from "./graph.js";
import { logger } from "./logger.js";
import { writeFileSync } from "node:fs";

const program = new Command();

program
  .name("mikan-press")
  .description("LangChain.js + LangGraph.js による記事執筆AIエージェント")
  .version("0.1.0");

program
  .command("generate")
  .description("記事を生成する")
  .requiredOption("-t, --topic <topic>", "記事のトピック")
  .option("-r, --max-reviews <number>", "最大レビュー回数", "3")
  .option("--skip-research", "リサーチフェーズをスキップ")
  .option("-o, --output <path>", "出力ファイルパス")
  .action(async (options: {
    topic: string;
    maxReviews: string;
    skipResearch?: boolean;
    output?: string;
  }) => {
    const { topic, maxReviews, skipResearch, output } = options;

    logger.info(`\n📝 記事生成を開始します`);
    logger.info(`   トピック: ${topic}`);
    logger.info(`   最大レビュー回数: ${maxReviews}`);
    if (skipResearch) logger.info(`   リサーチ: スキップ`);
    logger.info("");

    const graph = buildGraph();

    const result = await graph.invoke({
      topic,
      maxReviews: parseInt(maxReviews, 10),
      skipResearch: !!skipResearch,
      reviewCount: 0,
      research: "",
      outline: "",
      draft: "",
      editedDraft: "",
      review: "",
      finalArticle: "",
      status: "researching" as const,
    });

    logger.info("\n✅ 記事生成が完了しました\n");

    if (output) {
      writeFileSync(output, result.finalArticle, "utf-8");
      logger.info(`📄 出力先: ${output}\n`);
    } else {
      console.log("---\n");
      console.log(result.finalArticle);
      console.log("\n---");
    }
  });

program.parse();
