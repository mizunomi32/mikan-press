# mikan-press テスト整備計画

## 現状

- テストファイル: **ゼロ**
- テストフレームワーク: **未設定**
- CI/CD: **なし**
- `zod` が依存に含まれるが未使用

## 方針

- **Bun の組み込みテストランナー** (`bun test`) を使用。追加の依存不要。
- `bun:test` の `mock` 機能で外部 API 呼び出しをモック化
- テストは `src/__tests__/` ディレクトリに配置
- テストスクリプトを `package.json` に追加

---

## ステップ

### 1. テスト基盤の設定
- `package.json` に `"test": "bun test"` スクリプトを追加
- `src/__tests__/` ディレクトリを作成

### 2. プロンプトビルダーのユニットテスト
**対象:** `src/prompts/research.ts`, `plan.ts`, `writer.ts`, `editor.ts`

純粋関数なのでモック不要。入力に対して期待される文字列が含まれるかを検証する。

- `buildResearchPrompt` — トピックと言語が正しく埋め込まれるか
- `buildPlanPrompt` — リサーチ結果の各フィールドが反映されるか
- `buildIntroPrompt` / `buildSectionPrompt` / `buildConclusionPrompt` — 各パラメータが反映されるか
- `buildEditorPrompt` — セクション構造(intro/body/conclusion)が正しく組み立てられるか

**ファイル:** `src/__tests__/prompts.test.ts`

### 3. エージェントの JSON パースロジックのテスト
**対象:** `ResearchAgent.parseJson`, `PlanAgent.parseJson`

- 正常な JSON 文字列 → 正しくパースされる
- マークダウンのコードフェンス付き JSON → strip されてパースされる
- 不正な文字列 → フォールバック構造が返される

これらは `private` メソッドなので、エージェントの `run()` を通してテストする（API 呼び出しをモック化）。

**ファイル:** `src/__tests__/agents.test.ts`

### 4. API クライアントのモックテスト
**対象:** `src/clients/glm.ts`, `src/clients/gemini.ts`

- `glmChat` — OpenAI SDK をモックし、正しいパラメータで呼ばれるか検証
- `geminiChat` — Google AI SDK をモックし、正しいプロンプトが渡されるか検証
- レスポンスが空の場合の挙動

**ファイル:** `src/__tests__/clients.test.ts`

### 5. ArticleAgent 統合テスト
**対象:** `src/agents/ArticleAgent.ts`

全サブエージェントの API 呼び出しをモックし、パイプライン全体が正しく動作するか検証。

- `run()` が `Article` 型のオブジェクトを返すか
- metadata が正しく設定されるか（topic, language, wordCount）
- デフォルト設定（language='ja', maxLength=3000）が適用されるか

**ファイル:** `src/__tests__/articleAgent.test.ts`

### 6. テストスクリプト実行・型チェック確認
- `bun test` で全テストが通ることを確認
- `bun run type-check` で型エラーがないことを確認

---

## テストファイル一覧（作成予定）

```
src/__tests__/
├── prompts.test.ts        # プロンプトビルダーのテスト
├── agents.test.ts         # エージェント JSON パース + 個別テスト
├── clients.test.ts        # API クライアントのモックテスト
└── articleAgent.test.ts   # 統合テスト
```

## 対象外（今回のスコープ外）

- CI/CD パイプラインの構築
- E2E テスト（実際の API を叩くテスト）
- Zod によるランタイムバリデーションの追加
