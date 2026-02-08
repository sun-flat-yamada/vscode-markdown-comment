> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# GitHub Operations Skill

このスキルは、本リポジトリにおけるGitおよびGitHub操作の必須ベストプラクティスを定義します。

## 1. 安全第一: Push with Lease

**ルール**: `git push --force` や `-f` は**絶対に使用しないでください**。
**ルール**: `amend` や `rebase` 後にリモートブランチを更新する場合は、**必ず** `git push --force-with-lease` を使用してください。

`--force-with-lease` は、まだfetchしていない他者の作業を誤って上書きすることを防ぎます。

```bash
# BAD (禁止)
git push --force origin feature/my-branch

# GOOD (推奨)
git push --force-with-lease origin feature/my-branch
```

## 2. コミットメッセージ (Conventional Commits)

[Conventional Commits](https://www.conventionalcommits.org/) 仕様に従ってください。

フォーマット: `<type>(<scope>): <subject>`

### Types (種類)
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor`: バグ修正も機能追加も行わないコード変更
- `perf`: パフォーマンスを向上させるコード変更
- `test`: テストの追加または修正
- `chore`: ビルドプロセスや補助ツールの変更

### 例
- `feat(core): 新しいコメント解析ロジックを追加`
- `fix(ui): サイドバーの重なり問題を修正`
- `docs(readme): インストール手順を更新`

## 3. ブランチ命名

以下のプレフィックスを使用した説明的な名前を付けてください：

- `feature/`: 新機能
- `fix/`: バグ修正
- `docs/`: ドキュメントの追加・更新
- `chore/`: メンテナンス作業

例: `feature/docs-workflow-improvement`
