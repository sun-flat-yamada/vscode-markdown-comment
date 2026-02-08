> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# メタデータファイル形式仕様

## 概要

本文書は、Markdown Commentで使用されるコメントメタデータファイルの形式を規定します。

## バージョン

`2.0`

## ファイル拡張子

- **フォーマットバージョン 2.0 (拡張機能バージョン v0.1.0 - )**: `.meta.json` (Pretty Printed JSON)
- **フォーマットバージョン 1.0 (拡張機能バージョン v0.0.1 - v0.0.7)**: `.meta.jsonl` (JSON Lines) - レガシー形式 (後方互換性のための読み取り専用サポート)

## ファイル命名規則

Markdownファイル `example.md` の場合、メタデータファイル名は `example.meta.json` となります。

## スキーマ

### ルートオブジェクト (Root Object)

| フィールド | 型 | 必須 | 説明 |
| ------- | ------ | -------- | ----------- |
| `version` | string | はい | フォーマットバージョン (例: "2.0") |
| `tags` | string[] | いいえ | このファイルで使用可能なタグ |
| `threads` | Thread[] | はい | コメントスレッドの配列 |

### スレッドオブジェクト (Thread Object)

| フィールド | 型 | 必須 | 説明 |
| ------- | ------ | -------- | ----------- |
| `id` | string | はい | 一意の識別子 (UUID) |
| `anchor` | Anchor | はい | テキストアンカー情報 |
| `comments` | Comment[] | はい | このスレッド内のコメント配列 |

### アンカーオブジェクト (Anchor Object)

| フィールド | 型 | 必須 | 説明 |
| ------- | ------ | -------- | ----------- |
| `text` | string | はい | アンカーされたテキスト |
| `contextBefore` | string | はい | アンカー直前のテキスト |
| `contextAfter` | string | はい | アンカー直後のテキスト |
| `offset` | number | はい | ドキュメント先頭からの文字オフセット |
| `length` | number | はい | アンカーテキストの長さ |

### コメントオブジェクト (Comment Object)

| フィールド | 型 | 必須 | 説明 |
| ------- | ------ | -------- | ----------- |
| `id` | string | はい | 一意の識別子 (UUID) |
| `content` | string | はい | コメント内容 |
| `author` | string | はい | 著者識別子 |
| `createdAt` | string | はい | ISO 8601 タイムスタンプ |
| `updatedAt` | string | はい | ISO 8601 タイムスタンプ |
| `status` | string | いいえ | ステータス: "open", "resolved", "closed" (ルートコメントのみ) |
| `tags` | string[] | いいえ | このコメントに割り当てられたタグ |

## 例

```json
{
  "version": "2.0",
  "tags": ["todo", "review", "bug"],
  "threads": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "anchor": {
        "text": "This section needs improvement",
        "contextBefore": "## Overview\n\n",
        "contextAfter": "\n\nThe following...",
        "offset": 15,
        "length": 30
      },
      "comments": [
        {
          "id": "c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
          "content": "Please add more examples here",
          "author": "reviewer@example.com",
          "createdAt": "2026-01-26T10:00:00Z",
          "updatedAt": "2026-01-26T10:00:00Z",
          "status": "open",
          "tags": ["documentation"]
        }
      ]
    }
  ]
}
```

## マイグレーション

ファイルの読み込み時:

1. `.meta.json` (新形式) を最初に試行します。
2. 失敗した場合、`.meta.jsonl` (レガシー形式) にフォールバックします。

ファイルの保存時:

- 常に `.meta.json` に Pretty Print (インデント2スペース) で書き込みます。
- レガシーの `.meta.jsonl` ファイルは、次回の保存時に自動的にマイグレーションされます。
