# mikan-press

記事執筆AIエージェント — TypeScript製。SupervisorAgent がサブエージェントを順次実行し、ReviewAgent によるレビューループで品質を担保します。モデルは環境変数で `provider/model` 形式で指定可能（Google / Zhipu / OpenAI / OpenRouter 対応）。

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                     SupervisorAgent                              │
│                                                                  │
│  1. ResearchAgent (デフォルト: Gemini 2.5 Flash Lite)             │
│     └── トピックのリサーチ・情報収集                             │
│                                                                  │
│  2. PlanAgent (デフォルト: Zhipu GLM-4 Flash)                     │
│     └── 記事構成・アウトライン生成                               │
│                                                                  │
│  3. WriterAgent (デフォルト: Zhipu GLM-4 Flash)                   │
│     └── 各セクションの逐次執筆                                   │
│                                                                  │
│  4. EditorAgent (デフォルト: Zhipu GLM-4 Flash)                   │
│     └── 校正・スタイル統一                                       │
│                                                                  │
│  5. ReviewAgent (デフォルト: Zhipu GLM-4 Flash)                   │
│     └── 各ステージ出力の品質レビュー・差し戻し（最大 N 回）       │
└─────────────────────────────────────────────────────────────────┘
```

全エージェントは統一 `chat()` 経由でプロバイダーを呼び出し、`*_MODEL` 環境変数でモデルを切り替えられます。

## 技術スタック・デフォルトモデル

| 役割 | 環境変数 | デフォルト | 用途 |
|------|----------|------------|------|
| リサーチ | `RESEARCH_MODEL` | `google/gemini-2.5-flash-lite` | 情報収集・キーワード抽出 |
| プランニング | `PLAN_MODEL` | `zhipu/glm-4-flash` | アウトライン・構成設計 |
| 執筆 | `WRITER_MODEL` | `zhipu/glm-4-flash` | セクション逐次執筆 |
| 編集 | `EDITOR_MODEL` | `zhipu/glm-4-flash` | 校正・スタイル統一 |
| レビュー | `REVIEW_MODEL` | `zhipu/glm-4-flash` | 品質レビュー・差し戻し |

**対応プロバイダー:** `google`, `zhipu`, `openai`, `openrouter`

## 必要条件

- [Bun](https://bun.sh) >= 1.0
- Zhipu AI APIキー（デフォルトの執筆・編集・レビュー用）
- Google AI APIキー（デフォルトのリサーチ用）  
  ※ OpenAI / OpenRouter のみ使う場合はそれぞれのAPIキー

## セットアップ

```bash
git clone <repo-url>
cd mikan-press

bun install

cp .env.example .env
# .env を編集してAPIキーと必要に応じてモデルを設定
```

### 環境変数

`.env` に以下を設定します。

**プロバイダー接続（必須なものだけ設定）**

```env
# Zhipu AI — デフォルトの執筆・編集・レビューに使用
# https://open.bigmodel.cn/ で取得
ZHIPU_API_KEY=your_zhipu_api_key_here

# Google AI — デフォルトのリサーチに使用
# https://aistudio.google.com/ で取得
GOOGLE_API_KEY=your_google_api_key_here
```

**オプション: プロバイダー追加**

```env
# OPENAI_API_KEY=...
# OPENAI_BASE_URL=...   # 省略時は https://api.openai.com/v1
# OPENROUTER_API_KEY=...
```

**オプション: エージェントごとのモデル（`provider/model`）**

```env
# 例: 執筆だけ GPT-4o、編集は Claude
# WRITER_MODEL=openai/gpt-4o
# EDITOR_MODEL=openrouter/anthropic/claude-sonnet-4
# REVIEW_MODEL=google/gemini-2.5-pro
```

**その他**

```env
ARTICLE_LANGUAGE=ja          # 出力言語 (ja / en)
MAX_ARTICLE_LENGTH=6000      # 最大文字数目安
```

## 使い方

### CLI（SupervisorAgent + レビューループ）

```bash
# 記事を生成（開発モード）
bun dev --topic "AIがもたらす未来の働き方"

# オプション
bun dev --topic "TypeScriptの型システム入門" \
  --length 2000 \
  --language ja \
  --output ./articles/output.md \
  --max-retries 2
```

### ビルド後に実行

```bash
bun run build
bun start --topic "AIがもたらす未来の働き方"
```

### プログラムから利用

**SupervisorAgent（レビュー付き・CLIと同じパイプライン）**

```typescript
import { SupervisorAgent } from './src/agents/SupervisorAgent';

const agent = new SupervisorAgent({
  topic: 'AIがもたらす未来の働き方',
  language: 'ja',
  maxLength: 3000,
  maxRetries: 2,
});

const article = await agent.run();
console.log(article.content);
```

**ArticleAgent（レビューなしのシンプルパイプライン）**

```typescript
import { ArticleAgent } from './src/agents/ArticleAgent';

const agent = new ArticleAgent({
  topic: 'AIがもたらす未来の働き方',
  language: 'ja',
  maxLength: 3000,
});

const article = await agent.run();
console.log(article.content);
```

### 開発・品質確認

```bash
bun test                    # 全テスト
bun test src/__tests__/prompts.test.ts   # 単一ファイル
bun run type-check          # 型チェック (tsc --noEmit)
bun run build               # ビルド (tsc → dist/)
```

## プロジェクト構成

```
mikan-press/
├── src/
│   ├── agents/
│   │   ├── SupervisorAgent.ts   # オーケストレーター（レビューループ管理）
│   │   ├── ArticleAgent.ts     # レビューなしのシンプルパイプライン
│   │   ├── ResearchAgent.ts
│   │   ├── PlanAgent.ts
│   │   ├── WriterAgent.ts
│   │   ├── EditorAgent.ts
│   │   └── ReviewAgent.ts
│   ├── clients/
│   │   ├── chat.ts             # 統一チャット (parseModelSpec, chat)
│   │   ├── model.ts            # モデル解決 (resolveModel 等)
│   │   ├── gemini.ts
│   │   ├── glm.ts
│   │   ├── openai.ts
│   │   └── openrouter.ts
│   ├── prompts/
│   │   ├── research.ts
│   │   ├── plan.ts
│   │   ├── writer.ts
│   │   ├── editor.ts
│   │   └── review.ts
│   ├── types/
│   │   └── index.ts
│   ├── __tests__/
│   └── index.ts               # CLI エントリ (commander)
├── articles/                  # 出力先（オプション）
├── .env.example
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

## エージェントフロー

```
topic 入力
   │
   ▼
ResearchAgent ──► ReviewAgent (NG なら差し戻し、最大 maxRetries 回)
   │
   ▼
PlanAgent ──► ReviewAgent
   │
   ▼
WriterAgent ──► ReviewAgent
   │
   ▼
EditorAgent ──► 最終記事
   │
   ▼
Markdown 出力
```

## ライセンス

MIT
