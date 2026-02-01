# Metadata File Format Specification

## Overview

This document specifies the format for comment metadata files used by Markdown Comment.

## Version

`2.0`

## File Extension

- **Format version 2.0 (Extension version v0.1.0 - )**: `.meta.json` (Pretty Printed JSON)
- **Format version 1.0 (Extension version v0.0.1 - v0.0.7)**: `.meta.jsonl` (JSON Lines) - LEGACY Format (read-only support for backward compatibility)

## File Naming

For a Markdown file `example.md`, the metadata file is named `example.meta.json`.

## Schema

### Root Object

| Field | Type | Required | Description |
| ------- | ------ | -------- | ----------- |
| `version` | string | Yes | Format version (e.g., "2.0") |
| `tags` | string[] | No | Available tags for this file |
| `threads` | Thread[] | Yes | Array of comment threads |

### Thread Object

| Field | Type | Required | Description |
| ------- | ------ | -------- | ----------- |
| `id` | string | Yes | Unique identifier (UUID) |
| `anchor` | Anchor | Yes | Text anchor information |
| `comments` | Comment[] | Yes | Array of comments in this thread |

### Anchor Object

| Field | Type | Required | Description |
| ------- | ------ | -------- | ----------- |
| `text` | string | Yes | The anchored text |
| `contextBefore` | string | Yes | Text before the anchor |
| `contextAfter` | string | Yes | Text after the anchor |
| `offset` | number | Yes | Character offset from document start |
| `length` | number | Yes | Length of anchored text |

### Comment Object

| Field | Type | Required | Description |
| ------- | ------ | -------- | ----------- |
| `id` | string | Yes | Unique identifier (UUID) |
| `content` | string | Yes | Comment content |
| `author` | string | Yes | Author identifier |
| `createdAt` | string | Yes | ISO 8601 timestamp |
| `updatedAt` | string | Yes | ISO 8601 timestamp |
| `status` | string | No | Status: "open", "resolved", "closed" (root comment only) |
| `tags` | string[] | No | Tags assigned to this comment |

## Example

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

## Migration

When reading files:

1. Try `.meta.json` first (new format)
2. Fall back to `.meta.jsonl` (legacy format)

When saving files:

- Always write to `.meta.json` with Pretty Print (2-space indent)
- Legacy `.meta.jsonl` files are automatically migrated on next save
