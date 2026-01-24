# Architecture Rules (Clean Architecture)

このプロジェクトは **Clean Architecture** に基づいて構成されています。各レイヤーの責務を遵守し、依存関係のルールを厳守してください。

## Layer Responsibilities

### 1. Domain Layer (`src/domain`)

- **責務**: ビジネスロジック、エンティティ、ドメインサービス、および外部サービスのインターフェース（Repository 等）の定義。
- **制約**: 他のどのレイヤーにも依存してはならない。Node.js の組み込みモジュールへの依存も最小限にすること。

### 2. Application Layer (`src/application`)

- **責務**: ユースケースの実装、ドメインオブジェクトのオーケストレーション。
- **制約**: **Domain** レイヤーにのみ依存できる。外部サービス（VS Code API 等）の実装に依存してはならない。

### 3. Interface Layer (`src/interface`)

- **責務**: コマンドハンドラー、プレゼンター。外部からの入力を受け取り、Application/Domain レイヤーに橋渡しするアダプター。
- **制約**: **Application** および **Domain** レイヤーに依存できる。

### 4. Infrastructure Layer (`src/infrastructure`)

- **責務**: VS Code API 呼び出し、ファイルシステム操作、Repository インターフェースの具象実装。
- **制約**: **Application**, **Domain** レイヤー、および外部ライブラリ（`vscode` 等）に依存できる。

## Dependency Rule

- **依存関係の方向**: 依存関係は常に **外側から内側** に向かう必要があります（Infrastructure → Interface → Application → Domain）。
- 内側のレイヤーが外側のレイヤー（例: `src/domain` が `src/infrastructure`）をインポートすることは厳禁です。

## Interface-Based Design

- 外部リソース（ファイルシステム、VS Code API 等）に依存する操作は、必ず `Application` または `Domain` レイヤーでインターフェースを定義し、`Infrastructure` レイヤーで実装してください。
- これにより、ユニットテスト時にモックが容易になります。
