# Hooks Configuration

このディレクトリには、Antigravity のトリガーベース自動化フックを定義します。

## 定義済みフック

### 1. doc-update-reminder (PostEdit)

**トリガー**: TypeScript/JavaScript ファイルの編集後

コード変更後にドキュメント更新の必要性をリマインドします。

### 2. doc-sync-on-stop (Stop)

**トリガー**: タスク完了時

タスク完了前に以下を確認するチェックリストを表示:
- README.md の正確性
- GEMINI.md の整合性
- 古い情報が残っていないこと

### 3. pre-commit-doc-check (PreCommit)

**トリガー**: コミット前

ドキュメントの整合性を検証し、警告を表示します。

### 4. architecture-violation-check (PostEdit)

**トリガー**: Domain レイヤーのファイル編集後

Clean Architecture の依存関係違反を検出します。

## 重要なルール

> [!IMPORTANT]
> **コード変更を行った際は、必ず影響ドキュメントを総点検して更新反映すること。**

これはプロジェクトの必須ルールであり、hooks.json で自動リマインドされますが、最終的な責任は開発者にあります。

### 確認すべきドキュメント

1. **README.md** - 機能説明、使用方法
2. **GEMINI.md** - AI コンテキスト、アーキテクチャ概要
3. **インラインコメント** - 複雑なロジックの説明
4. **ワークフロー文書** (`.agent/workflows/`)
