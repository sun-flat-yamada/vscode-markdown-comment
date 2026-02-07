> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

![Markdown Comment Logo](images/vscode-mdc-icon.png)

# Markdown Comment

**VS Code での Markdown ワークフローを強化**

[English](https://github.com/sun-flat-yamada/vscode-markdown-comment/blob/main/README.md) | [日本語](https://github.com/sun-flat-yamada/vscode-markdown-comment/blob/main/README.ja.md)

![Version](https://img.shields.io/visual-studio-marketplace/v/sun-flat-yamada.markdown-comment?style=flat-square&color=007ACC)
![Installs](https://img.shields.io/visual-studio-marketplace/i/sun-flat-yamada.markdown-comment?style=flat-square&color=success)
![Rating](https://img.shields.io/visual-studio-marketplace/r/sun-flat-yamada.markdown-comment?style=flat-square)
![Build Status](https://github.com/sun-flat-yamada/vscode-markdown-comment/actions/workflows/ci.yml/badge.svg)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

---

**Markdown Comment** は、Markdown ファイルに対して PDF のようなコメントや返信機能を提供します。最大の特徴は、**Markdown ファイル自体には変更を加えない**ため、コンテンツをクリーンかつピュアな状態に保てることです。

Markdown ファイルはドキュメントや AI とのやり取りにますます使用されていますが、この拡張機能はレビューやコメントをスマートに管理し、開発者と非技術者の間にあるギャップを埋める役割を果たします。

> [!NOTE]
> コメントデータは別のメタデータファイル (your-md-file.meta.jsonl) に永続化されます。
> ファイル仕様の詳細については、以下を参照してください：
> [ファイル仕様](./docs/meta-schema/README.md)

> [!NOTE]
> 将来的には、アクセシビリティをさらに拡大するために、ビューアやエディタ用のブラウザ拡張機能も計画されています。

## ✨ 主な機能

- **Google Antigravity UI**: プレミアムなユーザー体験を提供する、完全に刷新されたモダンなビジュアル。
- **Markdown プレビュー統合**: ネイティブプレビュー内で、リッチなハイライト付きでコメントを直接表示できます。
- **ハイライト機能の向上**: ネストされたコメント範囲をサポートし、ホバーでコメント内容を表示します。
- **サイドバー同期**: プレビューのハイライトとコメントサイドバー間をシームレスに移動できます。
- **堅牢なレンダリング**: コメントのハイライトが画像タグやその他の複雑な Markdown 構造を壊すことはなくなりました。
- **専用エディタ**: オーバーレイコメント付きで Markdown を編集できます。
- **整理**: ツリーおよびテーブル表示により、効率的なコメント管理が可能です。
- **Open Recent**: メインメニューから最近開いたファイルに素早くアクセス。

| 機能 | スクリーンショット |
| :--- | :--- |
| コメント追加 | ![AddComment](images/docs/docs-md-preview-add-comment.png) |
| プレビュー | ![Preview](images/docs/docs-md-preview-comments-view.png) |
| インラインエディタ | ![Editor](images/docs/docs-md-editor-inline-comment-view.png) |
| ツリー表示 | ![Tree](images/docs/docs-md-comments-pane.png) |
| テーブル表示 | ![Table](images/docs/docs-md-comment-table-pane.png) |
| タグ編集 | ![EditTags](images/docs/docs-md-comment-table-pane-edit-tags.png) |

## 🚀 使い方

1. **開く**: VS Code で Markdown ファイル (`.md`) を開きます。
2. **起動**: コマンドパレットを起動します (`Ctrl+Shift+P` / `Cmd+Shift+P`)。
3. **選択**: `Markdown Comment: Open preview to the Side` を選択します。
4. **コメント**: プレビューでテキストを選択し、右クリックして `[Add Comment]` を選択します。
5. **管理**: プレビュー内の "💬 Comments" ボタンをクリックしてサイドバーを開きます。サイドバーのコメントをクリックするとハイライトされたテキストにジャンプし、ハイライトをクリックするとサイドバーに表示されます。

## 💡 コメント機能のハイライト

- **タグ付け**: カスタムタグでコメントを分類できます (QuickPick で管理)。
- **テーブル機能の強化**: 列のサイズ変更、ドラッグ＆ドロップによる並べ替え、ヘッダーのクリックによるソート。

- **スレッド化**: 無制限に返信を投稿して、焦点を絞った議論スレッドを作成できます。
- **ステータス追跡**: コメントを Open、Resolved などとしてマークし、進捗を追跡できます。
- **リッチツールヒント**: プレビュー内のハイライトされたテキストにカーソルを合わせると、元のコメントと作成者が即座に表示されます。
- **同期ビュー**: プレビューのハイライトとサイドバーは完全に同期されており、大きなドキュメント内での会話の追跡が容易になります。

## ⌨️ コマンド

| コマンド | タイトル | 説明 |
| :--- | :--- | :--- |
| `markdown-comment.openPreview` | Open Preview | コメント付きの専用プレビューを開きます。 |
| `markdown-comment.openPreviewToSide` | Open Preview to the Side | プレビューを横に開きます。 |
| `markdown-comment.showCommentTable` | Show Comment Table | コメントテーブルビューを開きます。 |

## 🔧 技術詳細

- **非侵襲的**: コメントはサイドカーファイル (`filename.meta.jsonl`) に保存されます。
- **クリーンなデータ**: 元の Markdown ファイルは手つかずのままです。

## ⚙️ 設定

VS Code 設定から拡張機能をカスタマイズできます：

| 設定 | タイプ | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | コメントテーブルに表示する列 (行番号、内容、ステータスなど)。 |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | テーブル列のピクセル幅。 |
| `markdownComment.defaultAuthor` | `string` | `""` | デフォルトの作成者名 (空の場合はシステムユーザーをデフォルトとします)。 |

## 🤝 貢献とサポート

貢献は大歓迎です！この拡張機能が役立つと感じられたら、開発のサポートをご検討ください。

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

## 📝 リリースノート

### 0.1.1 (Current)

- **UI 刷新**: Google Antigravity スタイルにインスパイアされた全面的なビジュアル更新（ライトモードベース、ピル形状、Inter フォント）。
- **ネイティブメニュー統合**: プレビュー内のコンテキストメニューをネイティブ化し、OS との親和性を向上。
- **Open Recent**: メインメニューに最近開いたファイルのサポートを追加。
- **レイアウト永続化**: サイドバーの幅と下部パネルの高さが保存・復元されるようになりました。
- **アンカー精度の向上**: 周辺コンテキストマッチングにより、コメントアンカーの特定精度を改善。
- **テストインフラ**: ワークスペースルートをクリーンに保つため、`.vscode-test` を `out` ディレクトリに移動。

### 0.1.0

- メタファイル形式を ver2.0 に変更 (自動移行サポートを含む)
- クライアントビューアアプリを追加
- リファクタリング
- ゼロ長コメントとヘッダー保護に関するレンダラーの問題を修正

### 0.0.7

- 初回リリースバージョン

### 0.0.1 - 0.0.6

- 使用しないでください

### 開発セットアップ
- Node.js 20 以上が必要です。
1. `npm install`
2. `npm run compile`
3. `npm run test:e2e -w packages/electron-app` (Electron E2E テストを実行する場合)
4. `F5` でデバッグ

### DevContainer を使用した開発
このリポジトリは、一貫した開発環境のために DevContainer をサポートしています。
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) と [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) をインストールします。
2. VS Code でプロジェクトを開きます。
3. `Dev Containers: Reopen in Container` を実行します。
4. 環境には Node.js と Electron/Playwright の依存関係がすべて含まれています。
