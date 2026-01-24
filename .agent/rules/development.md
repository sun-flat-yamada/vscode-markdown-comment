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
