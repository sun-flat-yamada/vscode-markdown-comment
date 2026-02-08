# Development Rules (TDD & Coding Standards)

このプロジェクトは **Test-Driven Development (TDD)** を基本方針としています。

## TDD Cycle (Red - Green - Refactor)

1. **Red**: 実装前に、期待される動作を記述した失敗するテストを作成します。
2. **Green**: テストをパスさせるための最小限のコードを実装します。
3. **Refactor**: テストが通っていることを確認しながら、コードの可読性や構造を改善します。

### Testing Stack

- **Unit Tests**: `mocha` + `ts-node` を使用。`src/**/*.test.ts` に配置。VS Code API に依存しないコード（Domain/Application）を対象とします。
- **Integration Tests**: VS Code 用のテストランナーを使用。`src/test/suite/**/*.test.ts` に配置。VS Code API の動作を確認します。

## Coding Standards

### TypeScript

- **Strict Typing**: `any` の使用を避け、適切な型を定義してください。
- **Immutability**: 可能な限り `readonly` や `const` を使用してください。
- **Naming**:
  - クラス: `PascalCase`
  - 関数・変数: `camelCase`
  - インターフェース: `I` 接頭辞は任意ですが、プロジェクト内で一貫性を持たせてください。

### Documentation

- **コード変更時の義務**: コードを変更した際は、必ず対応するドキュメント（README.md, GEMINI.md, インラインコメント等）を見直し、必要に応じて更新してください。
- **ドキュメントの整合性**: コードの実装とドキュメントの内容が常に一致していることを確認してください。

### Git Commit Messages

Conventional Commits に従ってください:

- `feat:`: 新機能
- `fix:`: バグ修正
- `docs:`: ドキュメントのみの変更
- `style:`: コードの意味に影響を与えない変更（ホワイトスペース、フォーマット等）
- `refactor:`: バグ修正も新機能も含まないコードの変更
- `test:`: 不足しているテストの追加や既存のテストの修正
- `chore:`: ビルドプロセスや補助ツールの変更

## Output Directory Management

> [!IMPORTANT]
> **AI エージェントに対する厳格な要件**:
> テスト実行、デバッグ、または一時的な作業ファイル（失敗ログ等）をルートディレクトリや各パッケージのソースディレクトリに作成してはいけません。
> すべての非コミット対象の動的出力は、プロジェクトルートの `.dev_output/` に集約してください。

- **対象ディレクトリ**: `.dev_output/` (ルート直下)
- **構造と命名規則**:
  - **カテゴリ別サブディレクトリ**: パッケージ名（例: `core/`, `electron-app/`, `vscode-extension/`）または作業名（`manual/`, `repro/`）ごとに階層を作ってください。
  - **ファイル名**: `YYYYMMDD_[context]_[description].[ext]` の形式を厳守してください。
    - 例: `20260208_vscode_extension_test_failure.log`

- **禁止事項**:
  - ルート直下への `test_*.txt` や `repro_*.md` などの直接配置。
  - パッケージ内の `src/` や `tests/` への一時出力の混入。
  - `npm run test` 等で標準出力のリダイレクトを行う際は、必ず `.dev_output/` 下を指定すること。

> [!CAUTION]
> AI エージェントが作業を終了する際、ルートディレクトリに自分が作成した一時ファイルが残っていないか必ず自己点検してください。

## Worktree Management

> [!IMPORTANT]
> **Worktree First Policy**:
> 新しいタスク（Issue）に着手する際、AI エージェントは必ず最初に作業用の Git Worktree を作成し、その中で作業を行わなければなりません。

1. **作成**: `chat-worktree` スキルを使用し、リポジトリルート内の **`.worktrees/`** ディレクトリ（`.gitignore` に追加済み）を作業環境として使用してください。
2. **絶対パスの遵守**: ワークツリー作成後は、ベースリポジトリのパスではなく、**ワークツリーの絶対パス**を全てのツール呼び出しで使用してください。
3. **コーパス制約の遵守**: Antigravityのアクセス制限（コーパス外へのアクセス制限）を避けるため、作業用ワークツリーは常にコーパス内に構築・維持してください。
4. **コミット・PR**: 全ての変更はワークツリー内のブランチに対して行い、PR作成までその環境を維持してください。
