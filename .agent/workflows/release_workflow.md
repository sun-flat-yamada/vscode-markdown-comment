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

## 4. 推奨: 新バージョンによる上書き (Deprecation by Upgrade)

不良バージョンを公開してしまった場合、**最も安全で推奨される対応**は、修正版のパッチバージョンを直ちにリリースすることです。

1. バグを修正し、バージョンを上げます (例: `0.0.5` -> `0.0.6`)。

2. 通常通りリリース手順を実行します。
   - ユーザーは自動的に新しい安全なバージョンへアップデートされます。
   - 不良バージョンは履歴に残りますが、最新ではなくなるため影響は最小限に抑えられます。

## 5. 緊急時: 不良バージョンの削除 (Unpublish)

機密情報の漏洩など、**緊急性が高く、該当バージョンを完全に削除しなければならない場合**にのみ実施してください。`vsce unpublish` は強力なコマンドであり、**拡張機能全体が削除**されます。

1. `vsce` で Unpublish します:

   ```bash
   npx vsce unpublish sun-flat-yamada.markdown-comment
   ```

2. 実行後、マーケットプレイスから消えていることを確認します。
