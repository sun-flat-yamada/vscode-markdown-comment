> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# VS Code Marketplace 公開手順

このドキュメントでは、VS Code 拡張機能を Marketplace に公開（Publish）するための手順を説明します。

## 前提条件

- [Node.js](https://nodejs.org/) がインストールされていること。
- [vsce](https://github.com/microsoft/vscode-vsce) がインストールされていること (`npm install -g vsce`)。
- Microsoft アカウントまたは GitHub アカウントを持っていること。

## 1. Publisher の作成

拡張機能を公開するには、まず Publisher（パブリッシャー）を作成する必要があります。

1. [Marketplace 管理ポータル](https://marketplace.visualstudio.com/manage) にアクセスします。
2. Microsoft アカウントまたは GitHub アカウントでサインインします。
3. 左側のメニューから [Create Publisher] を選択します。
4. 以下の情報を入力して作成します：
    - **Name**: URLに使用される識別子（例: `sun-flat-yamada`）。`package.json` の `publisher` フィールドと一致させる必要があります。
    - **Display Name**: 表示名。
    - **Description**: パブリッシャーの説明。

## 2. Personal Access Token (PAT) の取得

`vsce` コマンドで認証を行うために、Azure DevOps の Personal Access Token (PAT) が必要です。

1. [Azure DevOps](https://dev.azure.com/) にアクセスし、サインインします。
2. 組織（Organization）を選択するか、新しい組織を作成します（例: `sun-flat-yamada`）。
3. 右上のユーザー設定アイコン（歯車と人のアイコン）をクリックし、[Personal access tokens] を選択します。
4. [+ New Token] をクリックします。
5. 以下の設定でトークンを作成します：
    - **Name**: わかりやすい名前（例: `vscode-marketplace-publish`）。
    - **Organization**: `All accessible organizations` を選択。
    - **Expiration**: 有効期限を設定（最大1年）。
    - **Scopes**: [Show all scopes] をクリックし、`Marketplace` セクションを探します。
        - [x] `Acquire`
        - [x] `Manage`
    - **Note**: これ以外のスコープは不要です。最小限の権限に留めるのがセキュリティ上重要です。
6. [Create] をクリックし、生成されたトークンを**必ずコピー**して安全な場所に保存してください（この画面を閉じると二度と表示されません）。

## 3. GitHub Actions 用の Secrets 設定

CI/CD パイプライン（GitHub Actions）から自動デプロイを行う場合、PAT をリポジトリの Secrets に登録します。

1. GitHub リポジトリの [Settings] タブを開きます。
2. 左側のメニューから [Secrets and variables] > [Actions] を選択します。
3. [New repository secret] をクリックします。
4. 以下の情報を登録します：
    - **Name**: `VSCE_PAT`
    - **Secret**: 先ほど取得した PAT の文字列。
5. [Add secret] をクリックして保存します。

> [!IMPORTANT]
> PAT はパスワードと同様に扱い、決して `codepipeline` や `README.md` などの公開されるファイルに直接記述しないでください。

## 4. vsce コマンドによるパッケージ化と公開

### パッケージ化 (.vsix の作成)

ローカルでテストやインストールを行うためのパッケージファイルを作成します。

```bash
npm run package
# または
vsce package
```

これにより、カレントディレクトリに `markdown-comment-0.0.1.vsix` のようなファイルが生成されます。

### 公開 (Publish)

手動で Marketplace に公開する場合のコマンドです。

```bash
# クレデンシャルを含めてログイン（初回のみ）
vsce login <publisher-name>
# プロンプトに従って PAT を入力

# 公開実行
npm run deploy
# または
vsce publish
```

バージョンアップ時は、`package.json` の `version` を更新してから実行してください（例: `npm version patch`）。

### コマンドラインオプション

よく使う `vsce` オプション：
- `vsce package`: パッケージの作成のみ。
- `vsce publish`: パッケージ作成と公開。
- `vsce publish patch`: パッチバージョンを上げて公開（minor, major も可）。
- `vsce unpublish`: 公開の取り消し。

## 5. 自動化 (GitHub Actions)

`.github/workflows/deploy.yml` が設定されている場合、Git のタグを push することで自動的に公開が行われます。

1. `package.json` のバージョンを更新します。
2. 変更をコミットします。
3. タグを作成して push します。

```bash
git tag v0.0.2
git push origin v0.0.2
```

GitHub Actions が起動し、`VSCE_PAT` を使用して Marketplace への公開処理が実行されます。

### 誤ったタグを削除する場合

もし誤ったタグを push してしまった場合や、リトライが必要な場合は以下のコマンドでタグを削除できます。

1. ローカルタグの削除:
   ```bash
   git tag -d v0.0.x
   ```
2. リモードタグの削除:
   ```bash
   git push origin --delete v0.0.x
   ```
