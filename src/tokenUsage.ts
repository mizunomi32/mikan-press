import { logger } from "@/logger.js";

// ============================================================================
// 型定義
// ============================================================================

type UsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type ResponseMetadataWithUsage = {
  usage?: UsageLike;
  tokenUsage?: TokenUsage;
};

// ============================================================================
// Type Guard 関数
// ============================================================================

/**
 * 値が response_metadata 構造を持つか判定
 */
function isResponseMetadataWithUsage(value: unknown): value is ResponseMetadataWithUsage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // usage または tokenUsage の少なくとも一方が存在すれば有効とみなす
  return (
    (typeof obj.usage === "object" && obj.usage !== null) ||
    (typeof obj.tokenUsage === "object" && obj.tokenUsage !== null)
  );
}

/**
 * LangChain 実行結果の型チェック
 */
function isLangChainResult(value: unknown): value is {
  usage_metadata?: UsageLike;
  response_metadata?: Record<string, unknown>;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // usage_metadata または response_metadata の少なくとも一方が存在すれば有効とみなす
  return (
    obj.usage_metadata !== undefined ||
    (typeof obj.response_metadata === "object" && obj.response_metadata !== null)
  );
}

// ============================================================================
// 公開関数
// ============================================================================

/**
 * LangChain の invoke 結果（AIMessage 等）から usage を抽出
 * Type Guard を使用して型安全に値を取得します
 */
export function getUsage(result: {
  usage_metadata?: UsageLike;
  response_metadata?: Record<string, unknown>;
}): { input: number; output: number; total: number } | null {
  const metadata = result.response_metadata;
  const r = isResponseMetadataWithUsage(metadata) ? metadata : undefined;
  const tu = r?.tokenUsage;
  const u = result.usage_metadata ?? r?.usage;
  if (u) {
    const input = u.input_tokens ?? u.prompt_tokens;
    const output = u.output_tokens ?? u.completion_tokens;
    const total = u.total_tokens ?? (input != null && output != null ? input + output : undefined);
    if (input != null || output != null || total != null) {
      return {
        input: input ?? 0,
        output: output ?? 0,
        total: total ?? (input ?? 0) + (output ?? 0),
      };
    }
  }
  if (tu) {
    const input = tu.promptTokens ?? 0;
    const output = tu.completionTokens ?? 0;
    const total = tu.totalTokens ?? input + output;
    return { input, output, total };
  }
  return null;
}

export function logTokenUsage(label: string, result: unknown): void {
  if (!isLangChainResult(result)) {
    logger.debug(`[${label}] トークン使用量の取得に失敗しました: 不正な結果型`);
    return;
  }
  const usage = getUsage(result);
  if (usage) {
    logger.info(
      `[${label}] トークン: 入力=${usage.input} 出力=${usage.output} 合計=${usage.total}`,
    );
  }
}
