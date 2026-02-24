/**
 * プロンプトローダー
 *
 * エージェントごとのプロンプトをYAMLファイルから読み込みます。
 * ファイルが存在しない場合はフォールバックとして既存のTSファイルから読み込みます。
 */

import { logger } from "@/logger.js";
import { getPromptVersionFromEnv, loadPrompt } from "./reader.js";
import type { PromptFile } from "./types.js";

/**
 * フォールバックプロンプトの型
 */
type FallbackPrompt = {
  system: string;
  human: string;
  revision?: string;
};

// フォールバックプロンプト（既存のTSファイルからインポート）
let fallbackPrompts: Record<string, FallbackPrompt> | null = null;

/**
 * フォールバックプロンプトを遅延ロード
 */
async function loadFallbackPrompts(): Promise<Record<string, FallbackPrompt>> {
  if (fallbackPrompts) {
    return fallbackPrompts;
  }

  // 動的インポート
  const modules = await Promise.all([
    import("@/prompts/researcher.js"),
    import("@/prompts/planner.js"),
    import("@/prompts/writer.js"),
    import("@/prompts/editor.js"),
    import("@/prompts/reviewer.js"),
  ]);

  fallbackPrompts = {
    researcher: {
      system: modules[0].RESEARCHER_SYSTEM,
      human: modules[0].RESEARCHER_HUMAN,
    },
    planner: {
      system: modules[1].PLANNER_SYSTEM,
      human: modules[1].PLANNER_HUMAN,
    },
    writer: {
      system: modules[2].WRITER_SYSTEM,
      human: modules[2].WRITER_HUMAN,
      revision: modules[2].WRITER_REVISION_HUMAN,
    },
    editor: {
      system: modules[3].EDITOR_SYSTEM,
      human: modules[3].EDITOR_HUMAN,
    },
    reviewer: {
      system: modules[4].REVIEWER_SYSTEM,
      human: modules[4].REVIEWER_HUMAN,
    },
  };

  return fallbackPrompts;
}

/**
 * エージェント名からプロンプトファイル名へのマッピング
 */
const AGENT_TO_PROMPT_NAME: Record<string, string> = {
  researcher: "researcher",
  planner: "planner",
  writer: "writer",
  editor: "editor",
  reviewer: "reviewer",
};

/**
 * プロンプトを読み込む
 *
 * 1. 環境変数で指定されたバージョンのYAMLファイルを試す
 * 2. 見つからない場合はv1.yamlを試す
 * 3. それも見つからない場合は既存のTSファイルから読み込む
 *
 * @param agentName - エージェント名（例: "researcher"）
 * @param version - プロンプトバージョン（オプション、指定しない場合は環境変数またはデフォルト: 1）
 * @returns プロンプトファイル
 */
export async function loadAgentPrompt(
  agentName: string,
  version?: number,
): Promise<PromptFile> {
  const promptName = AGENT_TO_PROMPT_NAME[agentName];
  if (!promptName) {
    throw new Error(`未知のエージェント名: ${agentName}`);
  }

  // バージョンが指定されていない場合は環境変数から取得
  const targetVersion = version ?? getPromptVersionFromEnv(agentName);

  try {
    // YAMLファイルから読み込み
    const promptFile = await loadPrompt(promptName, targetVersion);
    logger.debug(
      `[PromptLoader] ${agentName} エージェントのプロンプトを読み込みました: v${targetVersion}`,
    );
    return promptFile;
  } catch (error) {
    // YAMLファイルが見つからない場合はフォールバック
    logger.warn(
      `[PromptLoader] YAMLプロンプトファイルが見つかりません: ${promptName} v${targetVersion}（フォールバック使用）`,
    );

    const fallbacks = await loadFallbackPrompts();
    const fallback = fallbacks[promptName];

    if (!fallback) {
      throw new Error(`${agentName} のフォールバックプロンプトが見つかりません`);
    }

    // フォールバックプロンプトをPromptFile形式に変換
    const result: PromptFile = {
      version: 1,
      created_at: new Date().toISOString(),
      description: "フォールバックプロンプト（TSファイルから）",
      author: "system",
      system: fallback.system,
      human: fallback.human,
    };
    if (fallback.revision) {
      result.revision = fallback.revision;
    }
    return result;
  }
}

/**
 * プロンプトのシステムプロンプトのみを取得
 *
 * @param agentName - エージェント名
 * @param version - プロンプトバージョン（オプション）
 * @returns システムプロンプト文字列
 */
export async function getSystemPrompt(
  agentName: string,
  version?: number,
): Promise<string> {
  const prompt = await loadAgentPrompt(agentName, version);
  return prompt.system;
}

/**
 * プロンプトのヒューマンプロンプトのみを取得
 *
 * @param agentName - エージェント名
 * @param version - プロンプトバージョン（オプション）
 * @returns ヒューマンプロンプト文字列
 */
export async function getHumanPrompt(
  agentName: string,
  version?: number,
): Promise<string> {
  const prompt = await loadAgentPrompt(agentName, version);
  return prompt.human;
}

/**
 * プロンプトの改稿用プロンプトを取得
 *
 * @param agentName - エージェント名
 * @param version - プロンプトバージョン（オプション）
 * @returns 改稿用プロンプト文字列（存在しない場合はundefined）
 */
export async function getRevisionPrompt(
  agentName: string,
  version?: number,
): Promise<string | undefined> {
  const prompt = await loadAgentPrompt(agentName, version);
  return prompt.revision;
}
