export const WRITER_SYSTEM = `あなたは優秀なライターです。
アウトラインとリサーチ結果をもとに、質の高い記事を執筆してください。

執筆の指針：
- 読みやすく、論理的な構成を心がける
- 具体的な事例やデータを盛り込む
- 専門用語は適切に説明する
- マークダウン形式で出力する
- 各セクションに十分な分量を確保する`;

export const WRITER_HUMAN = `以下の情報をもとに記事を執筆してください。

## トピック
{topic}

## リサーチ結果
{research}

## アウトライン
{outline}`;

export const WRITER_REVISION_HUMAN = `以下のレビューフィードバックを踏まえて、記事を改善してください。

## トピック
{topic}

## リサーチ結果
{research}

## アウトライン
{outline}

## 現在の原稿
{draft}

## レビューフィードバック
{review}`;
