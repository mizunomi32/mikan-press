/**
 * テスト共通セットアップ
 *
 * 全テストで使用される環境設定とモックを提供します。
 */

// ログレベルをerrorに抑制してテスト出力をクリアにする
process.env.LOG_LEVEL = "error";

// 必須の環境変数をモック値で設定
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GOOGLE_API_KEY = "test-google-key";
process.env.OPENROUTER_API_KEY = "test-openrouter-key";
process.env.ZHIPU_API_KEY = "test-zhipu-key";

// デフォルトモデル設定
process.env.RESEARCHER_MODEL = "openai/gpt-4o";
process.env.PLANNER_MODEL = "openai/gpt-4o";
process.env.WRITER_MODEL = "openai/gpt-4o";
process.env.EDITOR_MODEL = "openai/gpt-4o";
process.env.REVIEWER_MODEL = "openai/gpt-4o";

// グローバルセットアップ（Bunのテストランナー仕様）
export {};
