# Markdown Comment - Supercharges your Markdown workflow inside VSCode

[English](./README.md) | [日本語](./README.ja.md)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

Provides PDF-like commenting and replying functionality for Markdown. Best of all, it makes no changes to the Markdown file itself.

While Markdown files are increasingly used with AI, this extension also smartly solves review and comment management when working with non-IT engineers.

Browser extensions for Viewer and Editor are also planned for the future.

## Key Features

- Markdown Preview Window - with comment display functionality
- Markdown Editor Window - with comment display and editing functionality
- Tree view for Markdown comments
- Table view for Markdown comments

## Commenting Highlights

- Any tag can be added to comments
- Any number of replies can be posted iteratively to a parent comment
- Parent comments have a "status" to show the processing state of the comment

## Usage

1. Open a Markdown file (`.md`) in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3. Select `Markdown Comment: Open preview to the Side` and press `Enter` (it will appear as a suggestion as you type, making it easy to select).
4. The Markdown Preview window will appear.
5. In the Preview window, select the part you want to comment on, right-click, and select [Add Comment].
6. A comment input field will appear. Enter your comment and press `Enter` to register it.
7. Comments are visually displayed within the Preview window to show where they are attached.
8. Click the "💬 Comments" button at the top right of the Preview window to display the comments sidebar.
9. Comments are also displayed in the editing screen where the Markdown file is open. Here, you can reply, edit, and delete them.

## Technical Information

- Comment information is saved in a sidecar file (e.g., `yourfile.md.jsonl`).
- By using this method, it is completely non-invasive to the main Markdown file, making no changes to it whatsoever.

## Details

### List of Provided Commands

| Command | Title |
| :--- | :--- |
| `markdown-comment.openPreview` | Open Preview |
| `markdown-comment.openPreviewToSide` | Open Preview to the Side |
| `markdown-comment.showCommentTable` | Show Comment Table |
| `markdown-comment.analyze` | Analyze Markdown Document |
| `markdown-comment.addComment` | Add Comment |
| `markdown-comment.editComment` | Edit Comment |
| `markdown-comment.deleteComment` | Delete Comment |
| `markdown-comment.changeCommentStatus` | Change Status |

### List of Settings

This extension provides the following settings:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | Columns to display in the Comment Table and their order. |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | Widths of the columns in the Comment Table in pixels. |
| `markdownComment.defaultAuthor` | `string` | `""` | Default author name for comments. |

### Requirements

- VS Code 1.80.0 or higher.

### Release Notes

### 0.0.1

- First release of Markdown Comment
- Standardized date format in Comment Table to 24-hour `yyyy-mm-dd hh:mm:ss`

## Sponsor

Your support helps. Contributions are welcome:

- [Buy Me a Coffee](https://buymeacoffee.com/sun.flat.yamada)

## Development and Contribution

### Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.

### Build and Test

- `npm run compile`: Build the extension.
- `npm run watch`: Watch for changes.
- `npm test`: Run the test suite.

### Debug

- Open the project in VS Code.
- Press `F5` to launch the Extension Development Host.

### Deployment

#### Local Installation

You can create a `.vsix` file for local installation:

```bash
npm run package
```

Then, install it via VS Code's "Install from VSIX...".

#### Marketplace Release

Releases are automated via GitHub Actions when you push a tagged commit (e.g., `v0.0.1`).
Ensure that `VSCE_PAT` is configured in the repository secrets for authentication.
