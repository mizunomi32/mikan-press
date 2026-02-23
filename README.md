# mikan-press

LangChain.js + LangGraph.js による記事執筆AIエージェント。

複数のAIエージェントが協調して、リサーチからレビューまでの記事執筆プロセスを自動化します。

## ワークフロー

各エージェントは出力末尾で **PROCEED**（次へ）または **RETRY**（自分でやり直し）を選べます。Retry は `--max-retries-per-agent` で上限を指定できます。

```
START → Researcher ⇄ Planner ⇄ Writer ⇄ Editor ⇄ Reviewer
         (RETRY)    (RETRY)    (RETRY)   (RETRY)      ↓
                                                      ├── APPROVE → END
                                                      └── REVISE → Writer → ...
```

- **Researcher / Planner / Writer / Editor**: 自己ループ（RETRY で自分に戻る）
- **Reviewer**: 承認（APPROVE）で終了、差し戻し（REVISE）で Writer に戻る（`--max-reviews` で上限）

| エージェント | 役割 |
|---|---|
| Researcher | トピックに関する情報を調査・整理。末尾で PROCEED / RETRY |
| Planner | リサーチ結果をもとにアウトラインを作成。末尾で PROCEED / RETRY |
| Writer | アウトラインに沿って記事を執筆。末尾で PROCEED / RETRY |
| Editor | 文法・表記の校正、文章の改善。末尾で PROCEED / RETRY |
| Reviewer | 品質レビュー。APPROVE で終了、REVISE で Writer に差し戻し（最大回数は `--max-reviews`） |

## セットアップ

```bash
# 依存パッケージのインストール
bun install

# 環境変数の設定
cp .env.example .env
# .env を編集してAPIキーを設定
```

## 使い方

```bash
# 記事を生成
bun run dev -- generate --topic "AIの未来"

# ファイルに出力
bun run dev -- generate --topic "AIの未来" -o output.md

# 最大レビュー回数を指定（デフォルト: 3）
bun run dev -- generate --topic "AIの未来" --max-reviews 5

# 各エージェントの最大やり直し回数を指定（デフォルト: 1）
bun run dev -- generate --topic "AIの未来" --max-retries-per-agent 2

# リサーチをスキップ
bun run dev -- generate --topic "AIの未来" --skip-research
```

### CLI オプション

| オプション | 短縮形 | 説明 | デフォルト |
|---|---|---|---|
| `--topic` | `-t` | 記事のトピック（必須） | - |
| `--max-reviews` | `-r` | Reviewer の最大差し戻し回数 | 3 |
| `--max-retries-per-agent` | - | 各エージェントの最大 RETRY 回数 | 1 |
| `--skip-research` | - | リサーチフェーズをスキップ | false |
| `--output` | `-o` | 出力ファイルパス | stdout |

## モデル設定

エージェントごとに異なるモデルを指定できます。`.env` で `provider/model` 形式で設定してください。

```bash
# 対応プロバイダー
RESEARCHER_MODEL=gemini/gemini-2.5-flash
PLANNER_MODEL=openai/gpt-4o
WRITER_MODEL=openrouter/anthropic/claude-3.5-sonnet
EDITOR_MODEL=glm/glm-4-plus
REVIEWER_MODEL=openai/gpt-4o
```

| プロバイダー | 必要な環境変数 | 例 |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `openai/gpt-4o` |
| `gemini` | `GOOGLE_API_KEY` | `gemini/gemini-2.5-flash` |
| `openrouter` | `OPENROUTER_API_KEY` | `openrouter/anthropic/claude-3.5-sonnet` |
| `glm` | `ZHIPU_API_KEY` | `glm/glm-4-plus` |

## プロジェクト構成

```
src/
├── index.ts              # CLI エントリーポイント
├── config.ts             # モデル設定・ファクトリ
├── state.ts              # LangGraph 共有ステート定義
├── graph.ts              # LangGraph ワークフロー構築
├── agents/
│   ├── researcher.ts     # リサーチエージェント
│   ├── planner.ts        # アウトライン生成エージェント
│   ├── writer.ts         # 執筆エージェント
│   ├── editor.ts         # 編集・校正エージェント
│   └── reviewer.ts       # レビューエージェント
├── tools/
│   └── search.ts         # Web検索ツール（将来拡張用）
└── prompts/
    ├── researcher.ts
    ├── planner.ts
    ├── writer.ts
    ├── editor.ts
    └── reviewer.ts
```

## 開発

```bash
# 型チェック
bun run type-check

# ビルド
bun run build

# テスト
bun test
```
