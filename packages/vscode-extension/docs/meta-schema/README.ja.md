> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。

# メタデータファイルフォーマット仕様

本文書は、Markdown Comment 拡張機能がコメントやメタデータを永続化するために使用する `.meta.jsonl` ファイルの標準フォーマットを定義します。

## 概要

- **フォーマット**: JSON Lines (JSONL)
- **拡張子**: `.meta.jsonl`
- **命名規則**: `{対象ファイル名}.meta.jsonl`
  - 例: `README.md` の場合、メタデータファイルは `README.meta.jsonl` となります。
- **配置場所**: 対象の Markdown ファイルと同じディレクトリ。

## 構造

ファイル内の各行は単一の JSON オブジェクトを表します。現在、主要なオブジェクトタイプは `CommentThread` です。

### CommentThread

各行のルートオブジェクトは、ドキュメント内の特定の位置にアンカーされたコメントスレッドを表します。

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `type` | string | 識別子フィールド。値: `"comment_thread"`。 |
| `id` | string | スレッドの一意な識別子（通常はタイムスタンプ）。 |
| `anchor` | [CommentAnchor](#commentanchor) | ソースドキュメント内の位置情報。 |
| `comments` | [Comment](#comment)[] | スレッド内のコメント配列。 |

### CommentTagDict

ドキュメントで使用可能なタグのリストを保持し、サジェストやメタデータ追跡に使用されます。

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `type` | string | 識別子フィールド。値: `"comment_tag_dict"`。 |
| `tags` | string[] | タグ文字列の配列。 |

### CommentAnchor

コメントがソーステキストのどこに添付されているかを定義します。

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `text` | string | 選択されたテキスト（アンカーテキスト）。 |
| `contextBefore` | string | 選択範囲直前のテキスト（ファジーマッチング用）。 |
| `contextAfter` | string | 選択範囲直後のテキスト（ファジーマッチング用）。 |
| `offset` | number | ファイル内の0始まりの文字インデックス（作成時のスナップショット）。 |
| `length` | number | 選択されたテキストの長さ。 |

### Comment

スレッド内の個々のコメントまたは返信を表します。

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | string | 一意なID (例: `{threadId}.{sequence}`)。 |
| `content` | string | コメントの Markdown コンテンツ。 |
| `author` | string | 投稿者名。 |
| `createdAt` | string (ISO 8601) | 作成日時。 |
| `updatedAt` | string (ISO 8601) | 最終更新日時。 |
| `status` | string (enum) | コメントのステータス。値: `open`, `resolved`, `closed`。（任意） |
| `tags` | string[] | コメントに関連付けられたタグのリスト。（任意） |

## 例

```json
{"type":"comment_thread","id":"1769303277978","anchor":{"text":"Supercharges","contextBefore":"lign=\"center\">\n  <b>","contextAfter":" your Markdown workf","offset":152,"length":12},"comments":[{"id":"1769303277978.1","content":"This is a 1st comment!","author":"User","createdAt":"2026-01-25T01:07:57.978Z","updatedAt":"2026-01-25T01:07:57.978Z","status":"open","tags":["review","urgent"]},{"id":"1769303277978.2","content":"1st reply!","author":"User","createdAt":"2026-01-25T01:08:09.419Z","updatedAt":"2026-01-25T01:08:09.419Z","tags":[]}]}
```
