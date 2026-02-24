/**
 * TODO管理ツールの共通使用説明
 *
 * すべてのエージェントのシステムプロンプトに追加して使用します。
 */

export const TODO_TOOL_INSTRUCTIONS = `
## タスク管理ツール

以下のツールでタスクを管理できます：

- **todo_add**: 新しいタスクをTODOリストに追加
  - 例: 補足調査が必要な場合に「追加調査」タスクを作成
- **todo_update**: タスクの状態を更新
  - 作業開始時: in_progress に設定
  - 完了時: completed に設定
- **todo_list**: 現在のTODO一覧を確認
  - filter で "mine"（自分のタスク）、"pending"（未完了）などで絞り込み可能
- **todo_delegate**: 次のエージェントにタスクを依頼
  - 例: ライターに「事例の追加」を依頼

### 推奨ワークフロー

1. 作業開始前に \`todo_list\` で自分のタスクを確認
2. 作業開始時に \`todo_update\` でステータスを in_progress に変更
3. 必要に応じて \`todo_add\` でサブタスクを追加
4. 完了時に \`todo_update\` でステータスを completed に変更
5. 次のエージェントへの依頼がある場合は \`todo_delegate\` を使用

注意: ツールを使用せずに判断を下すことも可能です。必要に応じてツールを活用してください。`;
