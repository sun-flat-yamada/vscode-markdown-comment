> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

<p align="center">
  <img src="images/vscode-mdc-icon.png" alt="Markdown Comment Logo" width="128" />
</p>

# Markdown Comment

<p align="center">
  <b>VS Code 内の Markdown ワークフローを強力にサポート</b>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.ja.md">日本語</a>
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

**Markdown Comment** は、Markdown ファイルに対して PDF のようなコメントや返信機能を提供します。最大の特徴は、**Markdown ファイル自体には一切変更を加えない**点であり、コンテンツの純粋さを保ったまま管理できます。

Markdown ファイルがドキュメント作成や AI とのやり取りに広く使われるようになる中、この拡張機能はレビューやコメントをスマートに管理し、開発者と非技術的なステークホルダーの間の架け橋となります。

> [!NOTE]
> コメントデータは別のメタデータファイル（your-md-file.meta.jsonl）に保存されます。
> 詳細なファイル仕様については、以下を参照してください：
> [File Specification](./docs/meta-schema/README.md)

> [!NOTE]
> 将来的には、アクセシビリティをさらに拡大するため、ビューアーやエディター用のブラウザ拡張機能も計画しています。

## ✨ 主な機能

- **Markdown プレビュー統合**: ネイティブのプレビュー内でリッチなハイライト表示と共にコメントを確認できます。
- **改善されたハイライト**: ネストされたコメント範囲に対応し、ホバー時にコメント内容を表示します。
- **サイドバー同期**: プレビューのハイライトとコメントサイドバーの間をシームレスに移動できます。
- **堅牢なレンダリング**: コメントのハイライトが画像タグやその他の複雑な Markdown 構造を壊すことはありません。
- **専用エディター**: オーバーレイコメント付きで Markdown を編集できます。
- **効率的な管理**: ツリー表示やテーブル表示により、コメントを効率的に管理できます。

| 機能 | スクリーンショット |
| :--- | :--- |
| コメント追加 | ![AddComment](images/docs/docs-md-preview-add-comment.png) |
| プレビュー | ![Preview](images/docs/docs-md-preview-comments-view.png) |
| インラインエディター | ![Editor](images/docs/docs-md-editor-inline-comment-view.png) |
| ツリー表示 | ![Tree](images/docs/docs-md-comments-pane.png) |
| テーブル表示 | ![Table](images/docs/docs-md-comment-table-pane.png) |
| タグ編集 | ![EditTags](images/docs/docs-md-comment-table-pane-edit-tags.png) |

## 🚀 使い方

1. VS Code で Markdown ファイル (`.md`) を**開き**ます。
2. コマンドパレット (`Ctrl+Shift+P` / `Cmd+Shift+P`) を**起動**します。
3. `Markdown Comment: Open preview to the Side` を**選択**します。
4. **コメント**: プレビュー内でテキストを選択し、右クリックして `[Add Comment]` を選択します。
5. **管理**: プレビュー内の "💬 Comments" ボタンをクリックしてサイドバーを開きます。サイドバーのコメントをクリックすると該当箇所へスクロールし、ハイライトをクリックするとサイドバーの項目が強調されます。

## 💡 コメント機能のハイライト

- **タグ付け**: カスタムタグでコメントを分類できます (QuickPick で管理)。
- **列の並べ替え**: テーブルヘッダーをドラッグ＆ドロップして表示項目を整理できます。
- **スレッド化**: 制限なく返信を投稿し、フォーカスされた討論スレッドを作成できます。
- **ステータス追跡**: コメントに Open, Resolved などのマークを付け、進捗を追跡できます。
- **リッチなツールチップ**: プレビュー内のハイライトされたテキストにホバーすると、元のコメントと投稿者が即座に表示されます。
- **同期されたビュー**: プレビューのハイライトとサイドバーが完全に同期されており、長いドキュメントでも会話を追いやすくなっています。


## ⌨️ コマンド

| コマンド | タイトル | 説明 |
| :--- | :--- | :--- |
| `markdown-comment.openPreview` | Open Preview | コメント付きの専用プレビューを開きます。 |
| `markdown-comment.openPreviewToSide` | Open Preview to the Side | プレビューを横に開きます。 |
| `markdown-comment.showCommentTable` | Show Comment Table | コメントテーブルビューを開きます。 |

## 🔧 技術的詳細

- **非侵襲的**: コメントはサイドカーファイル (`filename.meta.jsonl`) に保存されます。
- **クリーンなデータ**: オリジナルの Markdown ファイルは一切変更されません。

## ⚙️ 設定

VS Code の設定から拡張機能をカスタマイズできます：

| 設定 | 型 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | コメントテーブルに表示する列 (lineNo, content, status 等)。 |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | テーブル列のピクセル幅。 |
| `markdownComment.defaultAuthor` | `string` | `""` | デフォルトの投稿者名 (空の場合はシステムユーザー名が使用されます)。 |

## 🤝 貢献とサポート

貢献は大歓迎です！この拡張機能が役立つと思われた場合は、開発のサポートをご検討ください。

<a href="https://buymeacoffee.com/sun.flat.yamada">
  <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>

## 📝 リリースノート

### 0.0.1
- 初期リリース

### 開発セットアップ
1. `npm install`
2. `npm run compile`
3. `F5` でデバッグ実行
