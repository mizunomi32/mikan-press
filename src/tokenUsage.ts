import { logger } from "./logger.js";

type UsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

// LangChain の invoke 結果（AIMessage 等）から usage を取るため any で受け付ける
function getUsage(result: {
  usage_metadata?: UsageLike;
  response_metadata?: Record<string, unknown>;
}): { input: number; output: number; total: number } | null {
  const r = result.response_metadata as
    | { usage?: UsageLike; tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }
    | undefined;
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
  const usage = getUsage(
    result as { usage_metadata?: UsageLike; response_metadata?: Record<string, unknown> }
  );
  if (usage) {
    logger.info(
      `[${label}] トークン: 入力=${usage.input} 出力=${usage.output} 合計=${usage.total}`
    );
  }
}
