# mikan-press

記事執筆AIエージェント — TypeScript製。GLM-5をメインの執筆・プランニングモデルに、Gemini 2.5 Flash Liteをリサーチ専用モデルとして使用します。

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│                  ArticleAgent                   │
│                                                 │
│  1. ResearchAgent (Gemini 2.5 Flash Lite)       │
│     └── トピックのリサーチ・情報収集             │
│                                                 │
│  2. PlanAgent (GLM-5)                           │
│     └── 記事構成・アウトライン生成               │
│                                                 │
│  3. WriterAgent (GLM-5)                         │
│     └── 各セクションの執筆                      │
│                                                 │
│  4. EditorAgent (GLM-5)                         │
│     └── 校正・品質チェック                      │
└─────────────────────────────────────────────────┘
```

## 技術スタック

| 役割 | モデル | 用途 |
|------|--------|------|
| リサーチ | Gemini 2.5 Flash Lite | Web検索・情報収集・事実確認 |
| プランニング | GLM-5 (Zhipu AI) | アウトライン生成・構成設計 |
| 執筆 | GLM-5 (Zhipu AI) | 本文執筆・セクション生成 |
| 編集 | GLM-5 (Zhipu AI) | 校正・スタイル統一 |

## 必要条件

- [Bun](https://bun.sh) >= 1.0
- Zhipu AI APIキー（GLM-5）
- Google AI APIキー（Gemini 2.5 Flash Lite）

## セットアップ

```bash
# リポジトリのクローン
git clone <repo-url>
cd mikan-press

# 依存関係のインストール
bun install

# 環境変数の設定
cp .env.example .env
# .env を編集してAPIキーを設定
```

### 環境変数

`.env` ファイルに以下を設定してください：

```env
# Zhipu AI (GLM-5)
# APIキー: https://open.bigmodel.cn/ から取得
ZHIPU_API_KEY=your_zhipu_api_key_here

# GLMモデルID (Zhipu AIのAPIドキュメントで最新のモデルIDを確認してください)
ZHIPU_MODEL=glm-4-flash

# Google AI (Gemini 2.5 Flash Lite)
# APIキー: https://aistudio.google.com/ から取得
GOOGLE_API_KEY=your_google_api_key_here

# オプション設定
ARTICLE_LANGUAGE=ja          # 出力言語 (ja / en)
MAX_ARTICLE_LENGTH=3000      # 最大文字数（目安）
```

## 使い方

### CLIから実行

```bash
# 記事を生成（開発モード）
bun dev --topic "AIがもたらす未来の働き方"

# オプション指定
bun dev --topic "TypeScriptの型システム入門" \
  --length 2000 \
  --language ja \
  --output ./articles/output.md
```

### ビルド後に実行

```bash
# ビルド
bun run build

# 実行
bun start --topic "AIがもたらす未来の働き方"
```

### プログラムから利用

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

## プロジェクト構成

```
mikan-press/
├── src/
│   ├── agents/
│   │   ├── ArticleAgent.ts      # メインエージェント（オーケストレーター）
│   │   ├── ResearchAgent.ts     # リサーチエージェント（Gemini）
│   │   ├── PlanAgent.ts         # プランニングエージェント（GLM）
│   │   ├── WriterAgent.ts       # 執筆エージェント（GLM）
│   │   └── EditorAgent.ts       # 編集エージェント（GLM）
│   ├── clients/
│   │   ├── glm.ts               # GLM APIクライアント
│   │   └── gemini.ts            # Gemini APIクライアント
│   ├── types/
│   │   └── index.ts             # 型定義
│   ├── prompts/
│   │   ├── research.ts          # リサーチ用プロンプト
│   │   ├── plan.ts              # プランニング用プロンプト
│   │   ├── writer.ts            # 執筆用プロンプト
│   │   └── editor.ts            # 編集用プロンプト
│   └── index.ts                 # CLIエントリーポイント
├── articles/                    # 生成された記事の出力先
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## エージェントフロー

```
topic入力
   │
   ▼
ResearchAgent (Gemini 2.5 Flash Lite)
   ├── トピックに関連する情報を収集
   ├── キーワード・統計・事例を抽出
   └── ResearchResult を返す
   │
   ▼
PlanAgent (GLM-5)
   ├── リサーチ結果を元にアウトライン生成
   ├── セクション構成を決定
   └── ArticlePlan を返す
   │
   ▼
WriterAgent (GLM-5)（各セクションを逐次執筆）
   ├── イントロダクション執筆
   ├── 各本文セクション執筆
   └── まとめ執筆
   │
   ▼
EditorAgent (GLM-5)
   ├── 全体の一貫性チェック
   ├── 表現の統一・改善
   └── 最終記事を返す
   │
   ▼
Markdown出力
```

## ライセンス

MIT
