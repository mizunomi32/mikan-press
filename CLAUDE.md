# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 会話ルール

- 常に日本語で会話する

## プロジェクト概要

mikan-press は LangChain.js + LangGraph.js を使用した記事執筆AIエージェント。複数のエージェント（Researcher → Planner → Writer → Editor → Reviewer）が協調して記事を自動生成する。

## 開発コマンド

```bash
# 開発実行（Bun）
bun run dev -- generate --topic "トピック名"
bun run dev -- generate --topic "トピック名" -o output.md --max-reviews 5

# ビルド・テスト
bun run build          # TypeScript → JS コンパイル（dist/）
bun run test           # Bun テストランナー
bun run type-check     # 型チェックのみ（emit無し）
```

## アーキテクチャ

### ワークフロー

```
START → Researcher ⇄ Planner ⇄ Writer ⇄ Editor ⇄ Reviewer → END
         (RETRY)    (RETRY)   (RETRY)  (RETRY)    APPROVE/REVISE
```

- 各エージェントは PROCEED/RETRY を自主判定し、品質が不十分なら自己ループする
- Reviewer が REVISE 判定すると Writer に差し戻される
- `maxReviews` と `maxRetriesPerAgent` で上限制御

### コード構成

- `src/index.ts` - CLI エントリーポイント（Commander.js）
- `src/graph.ts` - LangGraph ワークフローグラフ構築（条件付きエッジ・ルーティング）
- `src/state.ts` - `ArticleState` 共有ステート定義（LangGraph Annotation API）
- `src/config.ts` - モデルファクトリ。`provider/model` 形式で OpenAI/Gemini/OpenRouter/GLM に対応
- `src/agents/` - 各エージェントのノード実装。`ChatPromptTemplate.pipe(model)` パターン
- `src/prompts/` - 各エージェントのシステム/ヒューマンプロンプト定義
- `src/tools/search.ts` - Web検索ツール（未実装スケルトン）

### 主要パターン

- **ノード関数:** `async (state: ArticleState) => Partial<ArticleState>` で統一
- **ルーター関数:** 出力テキストの正規表現マッチング（PROCEED/RETRY/APPROVE/REVISE）で遷移先決定
- **モデル設定:** 環境変数 `RESEARCHER_MODEL=gemini/gemini-2.5-flash` のように エージェントごとに異なるモデル指定可能
- **トークン使用量:** `usage_metadata` / `response_metadata` から自動抽出してログ出力

## 環境変数

`.env.example` を参照。主要なもの：
- `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY` - プロバイダー別APIキー
- `RESEARCHER_MODEL`, `PLANNER_MODEL`, `WRITER_MODEL`, `EDITOR_MODEL`, `REVIEWER_MODEL` - エージェント別モデル指定
- `LOG_LEVEL` - ログレベル（error/warn/info/debug）
