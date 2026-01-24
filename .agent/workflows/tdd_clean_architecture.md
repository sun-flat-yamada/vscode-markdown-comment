# TDD & Clean Architecture 開発ワークフロー

このワークフローは、本プロジェクトにおける標準的な機能実装プロセスを定義します。
**Clean Architecture** の原則と **テスト駆動開発 (TDD)** を強制します。

## ワークフローの手順

### 1. 分析とタスク分割

- 要件を理解する。
- Clean Architecture のどのレイヤーに該当するかを特定する:
  - **Domain**: ビジネスルール (ピュアな TS、依存関係なし)。
  - **Application**: ユースケース (オーケストレーション、ピュアな TS)。
  - **Interface**: コントローラー、プレゼンター (アダプター)。
  - **Infrastructure**: VSCode API 呼び出し、データベース、外部サービス。

### 2. TDD サイクル (Red - Green - Refactor)

#### フェーズ 1: Domain / Application レイヤー (ユニットテスト)

*ビジネスロジックの実装はここから開始します。*

1. **Red**: `src/**/*.test.ts` に失敗するユニットテストを書く。
   - `mocha` + `ts-node` を使用 (高速な実行)。
   - 外部依存関係 (Repository インターフェースなど) はモックする。
2. **Green**: テストをパスさせるための最小限のコードを実装する。
3. **Refactor**: コードをクリーンアップする。
   - Clean Architecture の確認: Domain レイヤーが Infrastructure に依存していないか？ (依存してはいけない)。
   - 可読性を向上させる。

#### フェーズ 2: Interface / Infrastructure レイヤー (インテグレーションテスト)

*VSCode コマンドの配線や特定の API 操作はここから開始します。*

1. **Red**: `src/test/suite/**/*.test.ts` に失敗するインテグレーションテストを書く。
   - これらは VSCode ホスト内で実行されます。
2. **Green**: 配線 (コマンドの登録、イベントリスナーなど) を実装する。
3. **Refactor**: ロジックが Application レイヤーに委譲されていることを確認する。

### 3. 検証

// turbo
- 全てのユニットテストを実行: `npm run test:unit`
// turbo
- 全てのインテグレーションテストを実行: `npm run test:integration`
- 手動チェック: "Run Extension (Test Workspace)" デバッグプロファイルを使用する。

### 4. ドキュメントの更新 (必須)

- **コード変更を行った際は、必ず対応するドキュメントを見直し、更新すること。**
- `README.md` やアーキテクチャ図 (`GEMINI.md`) に影響がないか確認する。
- 変更内容を反映した `implementation_plan.md` や `walkthrough.md` が最新であることを確認する。
- 新しい機能を追加した場合は、必要に応じて新しいドキュメントを作成、または既存のものを拡張する。

---

## Clean Architecture ルール
- **Domain**: 何にも依存しない。
- **Application**: **Domain** に依存する。Infrastructure のためのインターフェースを定義する。
- **Interface**: **Application** と **Domain** に依存する。
- **Infrastructure**: **Application**, **Domain**, および **Frameworks (VSCode)** に依存する。
