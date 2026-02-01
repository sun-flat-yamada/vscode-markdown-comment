# Metadata File Format Specification

This document defines the standard format for the `.meta.jsonl` files used by the Markdown Comment extension to persist comments and metadata.

## Overview

- **Format**: JSON Lines (JSONL)
- **Extension**: `.meta.jsonl`
- **Naming Convention**: `{SourceFileName}.meta.jsonl`
  - Example: For `README.md`, the metadata file is `README.meta.jsonl`.
- **Location**: Same directory as the source Markdown file.

## Structure

Each line in the file represents a single JSON object. Currently, the primary object type is `CommentThread`.

### CommentThread Schema

The root object on each line represents a thread of comments anchored to a specific location in the document.

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | string | Discriminator field. Value: `"comment_thread"`. |
| `id` | string | Unique identifier for the thread (typically a timestamp). |
| `anchor` | [CommentAnchor](#commentanchor) | Location information in the source document. |
| `comments` | [Comment](#comment)[] | Array of comments in this thread. |

### CommentTagDict Schema

Stores the list of available tags for the document to provide suggestions and metadata tracking.

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | string | Discriminator field. Value: `"comment_tag_dict"`. |
| `tags` | string[] | Array of tag strings. |

### CommentAnchor

Defines where the comment is attached within the source text.

| Field | Type | Description |
| :--- | :--- | :--- |
| `text` | string | The selected text (the anchor text). |
| `contextBefore` | string | Text immediately preceding the selection (for fuzzy matching). |
| `contextAfter` | string | Text immediately following the selection (for fuzzy matching). |
| `offset` | number | Zero-based character index in the file (snapshot at creation time). |
| `length` | number | Length of the selected text. |

### Comment

Represents a single comment or reply within a thread.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique ID (e.g., `{threadId}.{sequence}`). |
| `content` | string | The Markdown content of the comment. |
| `author` | string | Name of the author. |
| `createdAt` | string (ISO 8601) | Creation timestamp. |
| `updatedAt` | string (ISO 8601) | Last modification timestamp. |
| `status` | string (enum) | Status of the comment. Values: `open`, `resolved`, `closed`. (Optional) |
| `tags` | string[] | List of tags associated with the comment. (Optional) |

## Example

```json
{"type":"comment_thread","id":"1769303277978","anchor":{"text":"Supercharges","contextBefore":"lign=\"center\">\n  <b>","contextAfter":" your Markdown workf","offset":152,"length":12},"comments":[{"id":"1769303277978.1","content":"This is a 1st comment!","author":"User","createdAt":"2026-01-25T01:07:57.978Z","updatedAt":"2026-01-25T01:07:57.978Z","status":"open","tags":["review","urgent"]},{"id":"1769303277978.2","content":"1st reply!","author":"User","createdAt":"2026-01-25T01:08:09.419Z","updatedAt":"2026-01-25T01:08:09.419Z","tags":[]}]}
```
