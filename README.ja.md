> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

<p align="center">
  <img src="images/vscode-mdc-icon.png" alt="Markdown Comment Logo" width="128" />
</p>

# Markdown Comment

<p align="center">
  <b>VS Code 内での Markdown ワークフローを強化</b>
</p>

<p align="center">
  <a href="https://github.com/sun-flat-yamada/vscode-markdown-comment/blob/main/README.md">English</a> | <a href="https://github.com/sun-flat-yamada/vscode-markdown-comment/blob/main/README.ja.md">日本語</a>
</p>

<p align="center">
  <!-- Version -->
  <img src="https://img.shields.io/visual-studio-marketplace/v/sun-flat-yamada.markdown-comment?style=flat-square&color=007ACC" alt="Version" />
  <!-- Installs -->
  <img src="https://img.shields.io/visual-studio-marketplace/i/sun-flat-yamada.markdown-comment?style=flat-square&color=success" alt="Installs" />
  <!-- Rating -->
  <img src="https://img.shields.io/visual-studio-marketplace/r/sun-flat-yamada.markdown-comment?style=flat-square" alt="Rating" />
  <!-- Build Status -->
  <img src="https://github.com/sun-flat-yamada/vscode-markdown-comment/actions/workflows/ci.yml/badge.svg" alt="Build Status" />
</p>

<p align="center">
  <a href="https://buymeacoffee.com/sun.flat.yamada">
    <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
  </a>
</p>

---

**Markdown Comment** は、Markdown ファイルに対して PDF のようなコメントおよび返信機能を提供します。何より、**Markdown ファイル自体には一切変更を加えず**、コンテンツをクリーンで純粋な状態に保ちます。

Markdown ファイルがドキュメントや AI との対話でますます使用されるようになる中、この拡張機能はレビューとコメントをスマートに管理し、開発者と非技術系ステークホルダーとの間のギャップを埋めます。

> [!NOTE]
> コメントデータは別のメタデータファイル (your-md-file.meta.jsonl) に永続化されます。
> 詳細なファイル仕様については、以下を参照してください:
> [ファイル仕様](./docs/meta-schema/README.ja.md)

> [!NOTE]
> 将来の計画には、アクセシビリティをさらに拡大するための閲覧者および編集者向けのブラウザ拡張機能が含まれています。

## ✨ 主な機能

- **Markdown プレビュー統合**: ネイティブプレビュー内で、リッチなハイライト付きでコメントを直接表示します。
- **改善されたハイライト**: ネストされたコメント範囲をサポートし、ホバー時にコメント内容を表示します。
- **サイドバー同期**: プレビューのハイライトとコメントサイドバー間をシームレスに移動できます。
- **堅牢なレンダリング**: コメントのハイライトによって画像タグやその他の複雑な Markdown 構造が壊れることはもうありません。
- **専用エディタ**: オーバーレイコメント付きで Markdown を編集できます。
- **整理**: 効率的なコメント管理のためのツリービューとテーブルビュー。

| 機能 | スクリーンショット |
| :--- | :--- |
| コメント追加  | ![AddComment](images/docs/docs-md-preview-add-comment.png) |
| プレビュー  | ![Preview](images/docs/docs-md-preview-comments-view.png) |
| インラインエディタ | ![Editor](images/docs/docs-md-editor-inline-comment-view.png) |
| ツリービュー | ![Tree](images/docs/docs-md-comments-pane.png) |
| テーブルビュー | ![Table](images/docs/docs-md-comment-table-pane.png) |
| タグ編集 | ![EditTags](images/docs/docs-md-comment-table-pane-edit-tags.png) |

## 🚀 使用方法

1. **開く**: VS Code で Markdown ファイル (`.md`) を開きます。
2. **起動する**: コマンドパレット (`Ctrl+Shift+P` / `Cmd+Shift+P`) を起動します。
3. **選択する**: `Markdown Comment: Open preview to the Side` を選択します。
4. **コメントする**: プレビューでテキストを選択し、右クリックして `[Add Comment]` を選択します。
5. **管理する**: プレビュー内の "💬 Comments" ボタンをクリックしてサイドバーを開きます。サイドバーのコメントをクリックしてハイライトされたテキストにジャンプするか、ハイライトをクリックしてサイドバーで表示します。

## 💡 コメントハイライト

- **タグ付け**: カスタムタグでコメントを分類します (QuickPick で管理)。
- **列の並べ替え**: テーブルヘッダーをドラッグアンドドロップしてビューを整理します。
- **スレッド化**: 無制限の返信を投稿して、焦点を絞ったディスカッションスレッドを作成します。
- **ステータス追跡**: コメントを Open, Resolved などとしてマークし、進捗を追跡します。
- **リッチツールチップ**: プレビュー内のハイライトされたテキストにホバーすると、元のコメントとその作成者が即座に表示されます。
- **同期されたビュー**: プレビューのハイライトとサイドバーは完全に同期されており、大きなドキュメント内での会話の追跡が容易になります。


## ⌨️ コマンド

| コマンド | タイトル | 説明 |
| :--- | :--- | :--- |
| `markdown-comment.openPreview` | Open Preview | コメント付きの専用プレビューを開きます。 |
| `markdown-comment.openPreviewToSide` | Open Preview to the Side | プレビューを横に開きます。 |
| `markdown-comment.showCommentTable` | Show Comment Table | コメントテーブルビューを開きます。 |

## 🔧 技術的な詳細

- **非侵襲的**: コメントはサイドカーファイル (`filename.meta.jsonl`) に保存されます。
- **クリーンデータ**: 元の Markdown ファイルは手つかずのままです。

## ⚙️ 設定

VS Code 設定を介して拡張機能をカスタマイズします:

| 設定 | 型 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | コメントテーブルに表示する列 (lineNo, content, status, etc.)。 |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | テーブル列のピクセル幅。 |
| `markdownComment.defaultAuthor` | `string` | `""` | デフォルトの作成者名 (空の場合はシステムユーザーをデフォルトとします)。 |

## 🤝 貢献とサポート

貢献は大歓迎です！この拡張機能が役立つと感じたら、開発のサポートを検討してください。

<a href="https://buymeacoffee.com/sun.flat.yamada">
  <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>

## 📝 リリースノート

### 0.0.4 - 0.0.5
- コマンドエラーの修正 (node_modulesをバンドル化)
### 0.0.3
- マーケットプレイスアイコンの追加
### 0.0.2
- デプロイスクリプトと設定の修正
### 0.0.1
- 初回リリース

### 開発セットアップ
- Node.js 20 以上が必要です。
1. `npm install`
2. `npm run compile`
3. `F5` でデバッグ
