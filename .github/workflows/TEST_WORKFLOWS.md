# GitHub Actions ワークフローのローカルテストガイド

このドキュメントでは、`ci.yml` と `deploy.yml` をローカルでテストする方法を説明します。

## 方法1: `act` を使用したテスト (推奨)

### 前提条件

- Docker Desktop がインストールされていること
- `act` がインストールされていること (`winget install nektos.act`)

### CI ワークフローのテスト

#### 全OSマトリックスでテスト

```powershell
# 環境変数を更新
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Ubuntu環境でテスト
act -j build --matrix os:ubuntu-latest

# Windows環境でテスト (要: Windows コンテナサポート)
act -j build --matrix os:windows-latest

# macOS環境でテスト (ローカルでは制限あり)
act -j build --matrix os:macos-latest
```

#### ドライラン (実際に実行せず、何が実行されるか確認)

```powershell
act -j build --matrix os:ubuntu-latest -n
```

#### 詳細ログ付きで実行

```powershell
act -j build --matrix os:ubuntu-latest -v
```

### Deploy ワークフローのテスト

Deploy ワークフローはタグpushでトリガーされるため、以下のようにテストします:

#### シークレットを使わずにテスト (publish ステップをスキップ)

```powershell
# ドライランで確認
act -j deploy -n

# ビルドステップまで実行 (publishは失敗するが continue-on-error で継続)
act -j deploy
```

#### シークレットを設定してテスト

```powershell
# .secrets ファイルを作成 (gitignoreに追加済み)
# 内容: VSCE_PAT=your_token_here

act -j deploy --secret-file .secrets
```

## 方法2: 手動でステップを実行 (より確実)

GitHub Actions の各ステップを手動で実行することで、確実にテストできます。

### CI ワークフローの手動テスト

```powershell
# プロジェクトルートで実行
cd v:\repos\sun.flat.yamada\vscode-markdown-comment

# 1. 依存関係のインストール
npm ci

# 2. コンパイル (Workspaces: Core & Extension)
npm run compile

# 3. Lint (Workspaces: Extension)
npm run lint

# 4. テスト (Workspaces: Core Unit & Extension Integration)
npm test

# 5. Electron E2E テスト (Workspaces: Electron App)
# 依存関係のインストール (初回のみ)
npx playwright install --with-deps

# ビルド
npm run build -w packages/electron-app

# テスト実行
npm run test:e2e -w packages/electron-app
```

### Deploy ワークフローの手動テスト

```powershell
# プロジェクトルートで実行
cd v:\repos\sun.flat.yamada\vscode-markdown-comment

# 1. 依存関係のインストール
npm ci

# 2. コンパイル
npm run compile

# 3. Lint
npm run lint

# 4. テスト
npm test

# 5. VSIXパッケージの作成 (実際のpublishはスキップ)
npx vsce package

# 生成された .vsix ファイルを確認
ls *.vsix
```

## Windows 環境での Docker 設定 (WSL2 使用時)

Windows のホスト側から WSL2 内で動作している Docker を使用して `act` を実行する場合、以下の手順で Docker エンジンへの接続を確立します。

### 1. Docker ホストのブリッジ接続 (socat)

WSL2 内の Docker UNIX ソケットを TCP 経由で Windows 側に公開する必要があります。以下のコマンドを PowerShell で実行して、一時的なプロキシコンテナを起動します。

```powershell
# WSL2 内で socat を使用して TCP ポート 2375 を Docker ソケットにブリッジ
wsl --exec docker run --rm -d -p 127.0.0.1:2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat TCP4-LISTEN:2375,fork,reuseaddr UNIX-CONNECT:/var/run/docker.sock
```

### 2. 環境変数の設定

`act` コマンドを実行する前に、`DOCKER_HOST` 環境変数を設定します。

```powershell
$env:DOCKER_HOST="tcp://127.0.0.1:2375"
```

### 3. `act` の実行

```powershell
act -j build --matrix os:ubuntu-latest
```

## トラブルシューティング

### `act` が動作しない場合 (Docker エラー)

`act` は GitHub Actions の実行環境をエミュレートするために **Docker** を必要とします。
`Error: error during connect` や `The system cannot find the file specified` というエラーが出る場合は、Docker が起動していないか、接続設定が正しくありません。

**解決策:**

1. WSL2 で `docker ps` が動作することを確認する。
2. 上記の「WSL2 使用時」の手順に従ってポートブリッジを確立する。
3. Docker が使えない環境では、「方法2: 手動でステップを実行」を参照してください。

## 最新のテスト実行結果 (2026-01-25)

全ワークフローを手動で検証し、以下の状態であることを確認済みです。

### ESLint & TypeScript

- **ESLint**: v8.57.1 (最新安定版)
- **TypeScript**: v5.3.3 (警告が出ない最新のサポートバージョン)
- **Lint**: 成功 (警告・エラーなし)

### CI & Deploy

- **build**: 全ステップ成功 (`npm ci`, `npm run compile`, `npm run lint`, `npm test`)
- **deploy**: VSIXパッケージ生成まで成功 (`npx vsce package`)

## ベストプラクティス

1. **ローカルテストの順序**:
   - まず手動でステップを実行 (方法2)
   - 次に `act` でドライラン (`-n` オプション)
   - 最後に `act` で実際に実行

2. **CIワークフローは頻繁にテスト**: コードを変更するたびに手動テストを実行

3. **Deployワークフローは慎重に**: 本番環境への影響を避けるため、ドライランまたはVSIXパッケージ作成までに留める

4. **シークレットの管理**: `.secrets` ファイルは絶対にコミットしない (`.gitignore` で除外済み)

## 参考リンク

- [act GitHub Repository](https://github.com/nektos/act)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
