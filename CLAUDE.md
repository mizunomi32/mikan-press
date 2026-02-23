# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 会話言語

常に日本語で会話する

## コマンド

```bash
bun install          # 依存関係のインストール
bun test             # 全テスト実行（Bun 組み込みテストランナー）
bun test src/__tests__/prompts.test.ts  # 単一テストファイル実行
bun run type-check   # 型チェック（tsc --noEmit）
bun run build        # ビルド（tsc → dist/）
bun dev --topic "トピック名"  # 開発モードで記事生成
```

## アーキテクチャ

記事執筆AIエージェント。SupervisorAgent がオーケストレーターとしてサブエージェントを順次実行し、ReviewAgent によるレビューループを管理するパイプライン構成。

**パイプライン:** topic → ResearchAgent → PlanAgent → WriterAgent → EditorAgent → Markdown記事

各エージェントは `chat()` 統一関数を通じてモデルを呼び出す。プロバイダーとモデルは環境変数で `provider/model` 形式で指定可能。

| エージェント | 環境変数 | デフォルト | 役割 |
|---|---|---|---|
| ResearchAgent | `RESEARCH_MODEL` | `google/gemini-2.5-flash-lite` | 情報収集 |
| PlanAgent | `PLAN_MODEL` | `zhipu/glm-4-flash` | アウトライン生成 |
| WriterAgent | `WRITER_MODEL` | `zhipu/glm-4-flash` | セクション逐次執筆 |
| EditorAgent | `EDITOR_MODEL` | `zhipu/glm-4-flash` | 校正・統一 |
| ReviewAgent | `REVIEW_MODEL` | `zhipu/glm-4-flash` | 品質レビュー |

**対応プロバイダー:** google, zhipu, openai, openrouter

**コード構成:**
- `src/agents/` — エージェント実装。SupervisorAgent がサブエージェントを統合・レビュー管理
- `src/clients/` — API クライアント
  - `chat.ts` — 統一チャットインターフェース（`parseModelSpec`, `resolveModel`, `chat`）
  - `gemini.ts` — Google AI SDK 経由
  - `glm.ts` — OpenAI SDK 経由（Zhipu AI）
  - `openai.ts` — OpenAI SDK 経由
  - `openrouter.ts` — OpenAI SDK 経由（OpenRouter）
- `src/prompts/` — 各エージェント用プロンプトビルダー（純粋関数）
- `src/types/index.ts` — 共有型定義（ChatMessage, ModelSpec, ArticleConfig, ResearchResult, ArticlePlan, Article 等）
- `src/index.ts` — CLI エントリーポイント（commander）

## テスト

- Bun 組み込みテストランナー使用。テストは `src/__tests__/` に配置
- API 呼び出しは `bun:test` の `mock` でモック化（`../clients/chat` の `chat` をモック）
- ResearchAgent/PlanAgent の `parseJson` は private なので `run()` 経由でテスト

## 環境変数

### プロバイダー接続情報
- `ZHIPU_API_KEY` — Zhipu AI APIキー（必須）
- `ZHIPU_BASE_URL` — Zhipu AI ベースURL（オプション）
- `ZHIPU_MODEL` — レガシーフォールバック用モデルID（デフォルト: `glm-4-flash`）
- `GOOGLE_API_KEY` — Google AI APIキー（必須）
- `OPENAI_API_KEY` — OpenAI APIキー（オプション）
- `OPENAI_BASE_URL` — OpenAI ベースURL（オプション）
- `OPENROUTER_API_KEY` — OpenRouter APIキー（オプション）

### エージェントモデル指定（`provider/model` 形式）
- `RESEARCH_MODEL` — ResearchAgent のモデル（デフォルト: `google/gemini-2.5-flash-lite`）
- `PLAN_MODEL` — PlanAgent のモデル（デフォルト: `zhipu/glm-4-flash`）
- `WRITER_MODEL` — WriterAgent のモデル（デフォルト: `zhipu/glm-4-flash`）
- `EDITOR_MODEL` — EditorAgent のモデル（デフォルト: `zhipu/glm-4-flash`）
- `REVIEW_MODEL` — ReviewAgent のモデル（デフォルト: `zhipu/glm-4-flash`）

### その他
- `ARTICLE_LANGUAGE` — 出力言語
- `MAX_ARTICLE_LENGTH` — 最大文字数目安
