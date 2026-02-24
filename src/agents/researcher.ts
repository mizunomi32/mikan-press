import type { Tool } from "@langchain/core/tools";
import { createToolEnabledAgent, type ToolEnabledAgentConfig } from "@/agents/agentFactory.js";
import { logger } from "@/logger.js";
import { getHumanPrompt, getSystemPrompt } from "@/prompts/loader.js";
import { RESEARCHER_HUMAN, RESEARCHER_SYSTEM } from "@/prompts/researcher.js";
import type { ArticleState } from "@/state.js";
import { webFetchTool } from "@/tools/fetch.js";
import { webSearchTool } from "@/tools/search.js";
import { type ResearcherInput, researcherInputSchema } from "@/types/prompts.js";

/**
 * Researcherエージェントのプロンプトを取得
 *
 * YAMLファイルが存在する場合はそれを使用し、存在しない場合はフォールバックプロンプトを使用する。
 */
async function getResearcherPrompts(): Promise<{
  systemPrompt: string;
  humanPromptTemplate: string;
}> {
  try {
    const version = Number.parseInt(process.env.RESEARCHER_PROMPT_VERSION ?? "1", 10);
    const systemPrompt = await getSystemPrompt("researcher", version);
    const humanPromptTemplate = await getHumanPrompt("researcher", version);
    logger.info(`[Researcher] プロンプト v${version} を使用します`);
    return { systemPrompt, humanPromptTemplate };
  } catch {
    // フォールバック: 既存のTSファイルから読み込み
    logger.debug("[Researcher] フォールバックプロンプトを使用します");
    return {
      systemPrompt: RESEARCHER_SYSTEM,
      humanPromptTemplate: RESEARCHER_HUMAN,
    };
  }
}

/**
 * Researcherエージェントの同期バージョン（フォールバックプロンプト使用）
 *
 * 下位互換性のために残しますが、非推奨です。
 */
const fallbackConfig: ToolEnabledAgentConfig<
  ResearcherInput,
  "researcherRetryCount",
  typeof researcherInputSchema
> = {
  name: "Researcher",
  modelType: "researcher",
  systemPrompt: RESEARCHER_SYSTEM,
  humanPromptTemplate: RESEARCHER_HUMAN,
  inputSchema: researcherInputSchema,
  inputExtractor: (state) => ({ topic: state.topic }),
  outputMapper: (content) => ({ research: content }),
  nextStatus: "planning",
  retryKey: "researcherRetryCount",
  completionMessage: "リサーチ完了",
  skipCondition: (state) => state.skipResearch,
  skipResponse: {
    research: "（リサーチスキップ）",
    status: "planning",
  },
  tools: [webSearchTool as unknown as Tool, webFetchTool as unknown as Tool],
  minOutputLength: 300,
  requireToolUse: true,
};

/**
 * Researcherエージェントノード（フォールバック）
 *
 * YAMLプロンプトを使用する場合は `createResearcherNode()` を使用してください。
 */
export const researcherNode = createToolEnabledAgent(fallbackConfig);

/**
 * Researcherエージェントノードを作成
 *
 * YAMLファイルからプロンプトを読み込んでエージェントノードを作成します。
 *
 * @param version - プロンプトバージョン（オプション、指定しない場合は環境変数またはデフォルト: 1）
 * @returns LangGraphノード関数
 */
export async function createResearcherNode(
  _version?: number,
): Promise<(state: typeof ArticleState.State) => Promise<Partial<typeof ArticleState.State>>> {
  const { systemPrompt, humanPromptTemplate } = await getResearcherPrompts();

  const config: ToolEnabledAgentConfig<
    ResearcherInput,
    "researcherRetryCount",
    typeof researcherInputSchema
  > = {
    name: "Researcher",
    modelType: "researcher",
    systemPrompt,
    humanPromptTemplate,
    inputSchema: researcherInputSchema,
    inputExtractor: (state) => ({ topic: state.topic }),
    outputMapper: (content) => ({ research: content }),
    nextStatus: "planning",
    retryKey: "researcherRetryCount",
    completionMessage: "リサーチ完了",
    skipCondition: (state) => state.skipResearch,
    skipResponse: {
      research: "（リサーチスキップ）",
      status: "planning",
    },
    tools: [webSearchTool as unknown as Tool, webFetchTool as unknown as Tool],
    minOutputLength: 300,
    requireToolUse: true,
  };

  return createToolEnabledAgent(config);
}
