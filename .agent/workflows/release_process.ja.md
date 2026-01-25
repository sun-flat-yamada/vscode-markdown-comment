> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and should refer to the English master.)

# リリースプロセス

このドキュメントでは、拡張機能の新しいリリースを準備し実行する手順について説明します。

## 前提条件

- リリースのための全ての変更がメイン開発ブランチにマージされていること。
- 全てのテストがパスしていること。


## 1. リリースの準備 (Prepare Release)

提供されている自動化スクリプトを使用して、リリースブランチの作成とバージョン更新を行います。

### Windows

プロジェクトルートからバッチスクリプトを実行します:

```cmd
.\scripts\prepare_release.bat
```

または、バージョンを直接指定します:

```cmd
.\scripts\prepare_release.bat 1.2.3
```

### Linux / macOS

シェルスクリプトを実行します:

```bash
./scripts/prepare_release.sh
```

または npm 経由で実行します (bash環境が必要です):

```bash
npm run release:prepare -- 1.2.3
```

**スクリプトの処理内容:**
1. 新しいブランチ `release/v<version>` を作成します。
2. `package.json` の `version` を更新します。
3. 変更をコミットします。

## 2. 検証とプッシュ (Verify and Push)

1. 必要に応じて追加のファイル (例: `CHANGELOG.md`) を修正します。
2. リリースブランチをプッシュします:
   ```bash
   git push origin release/v<version>
   ```

## 3. リリースの完了 (Finalize Release)

`release/v<version>` からメインブランチ (例: `main` または `master`) へ Pull Request を作成します。
マージ後、`release_workflow.md` に記載されている標準的なリリースワークフロー (タグ付けによるリリース) に従ってください。
