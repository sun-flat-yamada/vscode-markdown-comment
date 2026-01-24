> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# Markdown Comment - VSCode内でのMarkdownワークフローを強力にサポート

[English](./README.md) | [日本語](./README.ja.md)

Markdownに対してPDFのようなコメントや返信機能を提供します。最も重要なのは、Markdownファイル自体には一切の変更を加えないという点です。

MarkdownファイルがAIと共に利用される機会が増える中、本拡張機能はITエンジニア以外の方とのレビューやコメント管理もスマートに解決します。

将来的にはViewerやEditor用のブラウザ拡張機能も計画されています。

## 主な機能

- Markdownプレビューウィンドウ - コメント表示機能付き
- Markdownエディタウィンドウ - コメント表示・編集機能付き
- Markdownコメントのツリー表示
- Markdownコメントのテーブル表示

## コメント機能のハイライト

- コメントに任意のタグを追加可能
- 親コメントに対して任意の回数、繰り返し返信可能
- 親コメントには「ステータス」を設定し、処理状況を可視化可能

## 使い方

1. VS CodeでMarkdownファイル（`.md`）を開きます。
2. コマンドパレットを開きます（`Ctrl+Shift+P` または `Cmd+Shift+P`）。
3. `Markdown Comment: Open preview to the Side` を選択して `Enter` を押します（入力中に候補が表示されるので選択しやすくなっています）。
4. Markdownプレビューウィンドウが表示されます。
5. プレビューウィンドウでコメントしたい箇所を選択し、右クリックして [Add Comment] を選択します。
6. コメント入力フィールドが表示されます。コメントを入力して `Enter` を押すと登録されます。
7. プレビューウィンドウ内にコメントが視覚的に表示され、どこに紐付いているかがわかります。
8. プレビューウィンドウ右上の「💬 Comments」ボタンをクリックすると、コメントのサイドバーが表示されます。
9. Markdownファイルを開いている編集画面にもコメントが表示されます。ここでも返信、編集、削除が可能です。

## 技術情報

- コメント情報はサイドカーファイル（例：`yourfile.md.jsonl`）に保存されます。
- この方式を採用することで、メインのMarkdownファイルに対して完全に非侵襲であり、内容を一切変更しません。

## 詳細

### 提供コマンド一覧

| コマンド | タイトル |
| :--- | :--- |
| `markdown-comment.openPreview` | プレビューを開く |
| `markdown-comment.openPreviewToSide` | 横にプレビューを開く |
| `markdown-comment.showCommentTable` | コメントテーブルを表示 |
| `markdown-comment.analyze` | Markdownドキュメントを解析 |
| `markdown-comment.addComment` | コメントを追加 |
| `markdown-comment.editComment` | コメントを編集 |
| `markdown-comment.deleteComment` | コメントを削除 |
| `markdown-comment.changeCommentStatus` | ステータスを変更 |

### 設定項目一覧

本拡張機能は以下の設定を提供します：

| 設定名 | 型 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | コメントテーブルに表示する列とその順序。 |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | コメントテーブルの各列の幅（ピクセル）。 |
| `markdownComment.defaultAuthor` | `string` | `""` | コメントのデフォルト作成者名。 |

### 必要環境

- VS Code 1.80.0 以上。

### リリースノート

### 0.0.1

- Markdown Comment の初回リリース
- コメントテーブルの時刻表示を24時間形式（`yyyy-mm-dd hh:mm:ss`）に統一

## スポンサー

活動を継続するための支援を募集しています：

- [Buy Me a Coffee](https://buymeacoffee.com/sun.flat.yamada)

## 開発と貢献

### セットアップ

1. リポジトリをクローンします。
2. `npm install` を実行して依存関係をインストールします。

### ビルドとテスト

- `npm run compile`: 拡張機能をビルドします。
- `npm run watch`: 変更を監視して自動ビルドします。
- `npm test`: テストスイートを実行します。

### デバッグ

- プロジェクトを VS Code で開きます。
- `F5` を押して Extension Development Host を起動します。

### デプロイ

#### ローカルインストール

ローカルインストール用の `.vsix` ファイルを作成できます：

```bash
npm run package
```

その後、VS Code の "Install from VSIX..." を使用してインストールします。

#### Marketplace リリース

GitHub Actions により、タグ付きコミット（例：`v0.0.1`）をプッシュすると自動的にリリースされます。
認証のためにリポジトリの secrets に `VSCE_PAT` が設定されていることを確認してください。
