/**
 * プロンプトファイルリーダー
 *
 * YAMLファイルからプロンプトを読み込み、バージョン管理をサポートします。
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as yamlParse } from "yaml";
import { logger } from "@/logger.js";
import type { PromptFile } from "./types.js";

/**
 * プロンプトリーダーのキャッシュ
 */
const promptCache = new Map<string, PromptFile>();

/**
 * 拡張子の優先順位
 */
const PROMPT_EXTENSIONS = [".yaml", ".yml", ".json"] as const;

/**
 * プロンプトファイルを読み込む
 *
 * @param agentName - エージェント名（例: "researcher"）
 * @param version - プロンプトバージョン（デフォルト: 1）
 * @param promptsDir - プロンプトディレクトリのパス（デフォルト: "prompts"）
 * @returns プロンプトファイル
 * @throws Error ファイルが見つからない場合
 */
export async function loadPrompt(
  agentName: string,
  version: number = 1,
  promptsDir: string = "prompts",
): Promise<PromptFile> {
  const cacheKey = `${agentName}:v${version}`;

  // キャッシュをチェック
  if (promptCache.has(cacheKey)) {
    // biome-ignore lint/style/noNonNullAssertion: キャッシュヒット時は非nullが保証される
    return promptCache.get(cacheKey)!;
  }

  // ファイルパスを生成
  const basePath = resolve(process.cwd(), promptsDir, agentName);

  // 拡張子を試してファイルを探す
  let content: string | null = null;
  let filePath = "";
  let found = false;

  for (const ext of PROMPT_EXTENSIONS) {
    filePath = `${basePath}/v${version}${ext}`;
    try {
      content = await readFile(filePath, "utf-8");
      found = true;
      break;
    } catch {}
  }

  if (!found || content === null) {
    throw new Error(
      `プロンプトファイルが見つかりません: ${basePath}/v${version}{${PROMPT_EXTENSIONS.join(",")}}`,
    );
  }

  logger.debug(`[PromptLoader] プロンプトを読み込みました: ${filePath}`);

  // YAMLまたはJSONをパース
  let promptFile: PromptFile;
  try {
    if (filePath.endsWith(".json")) {
      // biome-ignore lint/style/noNonNullAssertion: contentはfound=trueのときに非nullが保証される
      promptFile = JSON.parse(content!) as PromptFile;
    } else {
      // biome-ignore lint/style/noNonNullAssertion: contentはfound=trueのときに非nullが保証される
      promptFile = yamlParse(content!) as PromptFile;
    }
  } catch (error) {
    throw new Error(`プロンプトファイルのパースに失敗しました: ${filePath}\n${error}`);
  }

  // バリデーション
  if (!promptFile.system) {
    throw new Error(`プロンプトファイルにsystemが定義されていません: ${filePath}`);
  }
  if (!promptFile.human) {
    throw new Error(`プロンプトファイルにhumanが定義されていません: ${filePath}`);
  }
  if (typeof promptFile.version !== "number") {
    throw new Error(`プロンプトファイルにversionが定義されていません: ${filePath}`);
  }

  // キャッシュに保存
  promptCache.set(cacheKey, promptFile);

  return promptFile;
}

/**
 * 環境変数からプロンプトバージョンを取得
 *
 * 環境変数: `${AGENT_NAME}_PROMPT_VERSION`（例: RESEARCHER_PROMPT_VERSION）
 *
 * @param agentName - エージェント名（例: "researcher"）
 * @returns プロンプトバージョン（環境変数がない場合は1）
 */
export function getPromptVersionFromEnv(agentName: string): number {
  const envKey = `${agentName.toUpperCase()}_PROMPT_VERSION`;
  const envValue = process.env[envKey];

  if (!envValue) {
    return 1;
  }

  const version = Number.parseInt(envValue, 10);
  if (Number.isNaN(version) || version < 1) {
    logger.warn(
      `[PromptLoader] 無効なプロンプトバージョンが指定されました: ${envKey}=${envValue}（デフォルト: 1）`,
    );
    return 1;
  }

  logger.info(`[PromptLoader] プロンプトバージョン: ${agentName} v${version}`);
  return version;
}

/**
 * プロンプトキャッシュをクリア
 *
 * テストや開発時に使用します。
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
