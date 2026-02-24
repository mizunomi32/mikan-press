import { z } from "zod";

/**
 * モデル文字列をパースする
 * 形式: "provider/model" (例: "openai/gpt-4o", "gemini/gemini-2.5-flash")
 */
export function parseModelString(value: string): { provider: string; model: string } {
  const parts = value.split("/");
  if (parts.length < 2) {
    throw new Error(
      `Invalid model format: "${value}". Expected "provider/model" (e.g. "openai/gpt-4o")`,
    );
  }
  const provider = parts[0] ?? "openai";
  const model = parts.slice(1).join("/");
  return { provider, model };
}

// 有効なプロバイダー一覧
const VALID_PROVIDERS = ["openai", "gemini", "openrouter", "glm"] as const;

// 空文字をundefinedに変換するrefine
const emptyToUndefined = z.string().transform((val) => (val.trim() === "" ? undefined : val));

// モデル文字列のスキーマ（provider/model形式）
const modelStringSchema = z
  .string()
  .transform((val) => (val.trim() === "" ? undefined : val))
  .superRefine((val, ctx) => {
    if (val === undefined) return; // 空文字/undefinedはスキップ（デフォルト値が使われる）
    const { provider } = parseModelString(val);
    if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid provider in "${val}". Valid providers: ${VALID_PROVIDERS.join(", ")}`,
      });
    }
  });

// APIキースキーマ（空文字は未設定として扱う）
const apiKeySchema = emptyToUndefined;

// ログレベルスキーマ（大文字/小文字を区別しない）
const logLevelSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(z.enum(["error", "warn", "info", "debug"]))
  .default("info");

// 正の整数スキーマ（リトライ設定用）
const positiveIntegerSchema = z
  .string()
  .transform((val) => (val.trim() === "" ? undefined : val))
  .superRefine((val, ctx) => {
    if (val === undefined) return;
    const num = Number.parseInt(val, 10);
    if (Number.isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${val}" is not a valid positive integer`,
      });
    }
  })
  .transform((val) => (val === undefined ? undefined : Number.parseInt(val, 10)));

// 環境変数の基底スキーマ
const envBaseSchema = z.object({
  // APIキー（条件付き必須）
  OPENAI_API_KEY: apiKeySchema.optional(),
  GOOGLE_API_KEY: apiKeySchema.optional(),
  OPENROUTER_API_KEY: apiKeySchema.optional(),
  ZHIPU_API_KEY: apiKeySchema.optional(),

  // GLMエンドポイント（任意）
  GLM_BASE_URL: z.string().optional(),

  // エージェントモデル（デフォルト: openai/gpt-4o）
  RESEARCHER_MODEL: modelStringSchema.default("openai/gpt-4o"),
  PLANNER_MODEL: modelStringSchema.default("openai/gpt-4o"),
  WRITER_MODEL: modelStringSchema.default("openai/gpt-4o"),
  EDITOR_MODEL: modelStringSchema.default("openai/gpt-4o"),
  REVIEWER_MODEL: modelStringSchema.default("openai/gpt-4o"),

  // ログレベル
  LOG_LEVEL: logLevelSchema,

  // リトライ・レビュー設定（任意、デフォルト値あり）
  MAX_RETRIES_PER_AGENT: positiveIntegerSchema.default(3),
  MAX_REVIEWS: positiveIntegerSchema.default(3),
});

// APIキーが少なくとも1つ必要という条件を追加
const envSchema = envBaseSchema.refine(
  (data) => {
    const hasApiKey =
      !!data.OPENAI_API_KEY ||
      !!data.GOOGLE_API_KEY ||
      !!data.OPENROUTER_API_KEY ||
      !!data.ZHIPU_API_KEY;
    return hasApiKey;
  },
  {
    message:
      "少なくとも1つのAPIキーが必要です: OPENAI_API_KEY, GOOGLE_API_KEY, OPENROUTER_API_KEY, または ZHIPU_API_KEY を設定してください。",
  },
);

export type Env = z.infer<typeof envBaseSchema>;

let cachedEnv: Env | null = null;

/**
 * 環境変数をバリデーションする
 * @throws {ZodError} バリデーションエラー時
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "全体";
      return `  - ${path}: ${issue.message}`;
    });

    console.error("\n❌ 環境変数のバリデーションエラー:\n");
    console.error(errorMessages.join("\n"));
    console.error("\n.env.example を参照して設定を確認してください。\n");

    throw result.error;
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * バリデーション済みの環境変数を取得する
 * 初回呼び出し時にバリデーションを実行
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    return validateEnv();
  }
  return cachedEnv;
}

/**
 * キャッシュをクリアする（テスト用）
 */
export function clearEnvCache(): void {
  cachedEnv = null;
}

export { envSchema };
