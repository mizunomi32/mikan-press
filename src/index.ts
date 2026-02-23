import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { buildGraph } from "@/graph.js";
import { logger } from "@/logger.js";

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
  .option("--max-retries-per-agent <number>", "各エージェントの最大やり直し回数", "1")
  .option("--skip-research", "リサーチフェーズをスキップ")
  .option("-o, --output <path>", "出力ファイルパス")
  .action(
    async (options: {
      topic: string;
      maxReviews: string;
      maxRetriesPerAgent?: string;
      skipResearch?: boolean;
      output?: string;
    }) => {
      const { topic, maxReviews, maxRetriesPerAgent, skipResearch, output } = options;

      logger.info(`\n📝 記事生成を開始します`);
      logger.info(`   トピック: ${topic}`);
      logger.info(`   最大レビュー回数: ${maxReviews}`);
      logger.info(`   各エージェント最大やり直し: ${maxRetriesPerAgent ?? "1"}回`);
      if (skipResearch) logger.info(`   リサーチ: スキップ`);
      logger.info("");

      const graph = buildGraph();

      const result = await graph.invoke({
        topic,
        maxReviews: parseInt(maxReviews, 10),
        maxRetriesPerAgent: parseInt(maxRetriesPerAgent ?? "1", 10),
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

      if (output) {
        writeFileSync(output, result.finalArticle, "utf-8");
        logger.info(`📄 出力先: ${output}\n`);
      } else {
        console.log("---\n");
        console.log(result.finalArticle);
        console.log("\n---");
      }
    },
  );

program.parse();
