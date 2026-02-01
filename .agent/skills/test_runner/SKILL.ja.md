---
name: test_runner
description: Markdown Comment 拡張機能および Electron アプリのテスト実行とトラブルシューティングに関する習熟度。
---

# Test Runner Skill (テスト実行スキル)

> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

このスキルは、Markdown Comment モノレポ全体のテストの実行と保守に関する指示を提供します。

## プロジェクト構造とテストコマンド

プロジェクトは以下のパッケージで構成されるモノレポ構造を採用しています：

| パッケージ | 目的 | テストコマンド |
| :--- | :--- | :--- |
| `packages/core` | コアビジネスロジック | `npm test -w packages/core` |
| `packages/vscode-extension` | VS Code 拡張機能アダプター | `npm test -w packages/vscode-extension` |
| `packages/electron-app` | スタンドアロン Electron アプリ | `npm run build -w packages/electron-app` (UI確認用) |

### グローバルコマンド
- 全テスト実行: `npm test`
- 全パッケージビルド: `npm run build:all`

## `vscode-extension` におけるテストの種類

1. **単体テスト (Unit Tests)**:
   - 場所: `packages/vscode-extension/src/**/*.test.ts`
   - コマンド: `npm run test:unit -w packages/vscode-extension`
   - フォーカス: VS Code API を使用しないビジネスロジックやインフラアダプター。

2. **統合テスト (Integration Tests)**:
   - 場所: `packages/vscode-extension/src/test/suite/**/*.ts`
   - コマンド: `npm run test:integration -w packages/vscode-extension`
   - フォーカス: VS Code 内部 API や UI を必要とする機能。

## トラブルシューティング

- **ビルド失敗**: `packages/core` に変更を加えた場合は、`npm run build:all` が実行されているか確認してください。
- **統合テストのハング**: ハングした VS Code インスタンスがないか確認し、必要に応じて終了させてください。
- **パスの問題**: Windows では、正規化ロジック（小文字の `c:` など）と一致するようにファイルパスが処理されていることを確認してください。

## 自動実行フック (Automation Hook)

このスキルは、`src` ディレクトリ内の `.ts` または `.js` ファイルが変更された際に、`hooks.json` によって自動的にトリガーされることを意図しています。
