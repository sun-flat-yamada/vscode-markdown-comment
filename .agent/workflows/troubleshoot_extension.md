# 拡張機能開発のトラブルシューティング

開発中やテスト中に問題が発生した場合は、このワークフローを使用してください。

## 1. ビルドの失敗
// turbo
1. TypeScript エラーを確認: `npm run compile`
2. エラーが解消されない場合は、出力ディレクトリのクリーンアップを試す: `Remove-Item -Recurse -Force ./out` (Windows) または `rm -rf ./out` (Unix)。
3. 依存関係の再インストール: `npm install`

## 2. テスト実行の問題
### ユニットテストが失敗する
- `ts-node` が mocha コマンドに正しく登録されているか確認してください。
- ユニットテスト対象のファイル (Domain/Application レイヤー) で `vscode` をインポートしていないことを確認してください。

### インテグレーションテストが失敗する

- VS Code インスタンスが起動できるか確認してください。
- 詳細は `integration_test.log` を確認してください。

// turbo
- `out/` ディレクトリが最新であることを確認してください: `npm run compile`。

## 3. Extension Development Host が起動しない
1. 全ての "Extension Development Host" ウィンドウを閉じます。
2. `.vscode/launch.json` の設定を確認します。
3. `package.json` の `main` が正しいエントリポイント (通常は `./out/extension.js`) を指しているか確認します。

## 4. ワークスペースのリセット
どうしても解決しない場合は、環境をリセットしてください:
// turbo
1. `npm run compile`
2. `npm test`
