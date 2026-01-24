# 拡張機能リリース ワークフロー

このワークフローは、拡張機能のパッケージングとリリースの手順を説明します。

## 1. ローカル パッケージング (VSIX)

1. **ドキュメントの最終確認**: 最新のコード変更が `README.md`, `GEMINI.md`, および `CHANGELOG.md` (存在する場合) に正しく反映されていることを厳格に確認する。
// turbo
2. 全てのテストがパスすることを確認: `npm test`
// turbo
3. 拡張機能をビルド: `npm run compile`
// turbo
4. VSIX パッケージを作成: `npm run package`
5. ルートディレクトリに `.vsix` ファイルが生成されます。

## 2. Marketplace リリース (自動)

リリースは、タグのプッシュによってトリガーされる GitHub Actions によって管理されます。

1. `package.json` のバージョンを更新します。
2. 変更をコミットしてプッシュします。
3. git タグを作成: `git tag vX.X.X`
4. タグをプッシュ: `git push origin vX.X.X`
5. GitHub Actions が以下の処理を行います:
   - テストの実行。
   - 拡張機能のビルド。
   - `VSCE_PAT` シークレットを使用して VS Code Marketplace に公開。

## 3. 手動リリース (CLI)

// turbo
1. vsce にログイン: `npx vsce login [publisher]`
// turbo
2. 公開: `npm run deploy`
