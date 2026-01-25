<p align="center">
  <img src="images/vscode-mdc-icon.png" alt="Markdown Comment Logo" width="128" />
</p>

# Markdown Comment

<p align="center">
  <b>Supercharges your Markdown workflow inside VS Code</b>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.ja.md">日本語</a>
</p>

<p align="center">
  <!-- Version -->
  <img src="https://img.shields.io/visual-studio-marketplace/v/sun-flat-yamada.markdown-comment?style=flat-square&color=007ACC" alt="Version" />
  <!-- Installs -->
  <img src="https://img.shields.io/visual-studio-marketplace/i/sun-flat-yamada.markdown-comment?style=flat-square&color=success" alt="Installs" />
  <!-- Rating -->
  <img src="https://img.shields.io/visual-studio-marketplace/r/sun-flat-yamada.markdown-comment?style=flat-square" alt="Rating" />
  <!-- Build Status -->
  <img src="https://github.com/sun-flat-yamada/vscode-markdown-comment/actions/workflows/ci.yml/badge.svg" alt="Build Status" />
</p>

<p align="center">
  <a href="https://buymeacoffee.com/sun.flat.yamada">
    <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
  </a>
</p>

---

**Markdown Comment** provides PDF-like commenting and replying functionality for Markdown files. Best of all, it makes **no changes** to the Markdown file itself, keeping your content clean and pure.

While Markdown files are increasingly used for documentation and AI interactions, this extension smartly manages reviews and comments, bridging the gap between developers and non-technical stakeholders.

> [!NOTE]
> Comment data is persisted in a separate metadata file (your-md-file.meta.jsonl).
> For detailed file specifications, please refer to the following:
> [File Specification](./docs/meta-schema/README.md)

> [!NOTE]
> Future plans include browser extensions for viewers and editors to further expand accessibility.

## ✨ Key Features

- **Markdown Preview Integration**: View comments directly within the native preview with rich highlighting.
- **Improved Highlighting**: Supports nested comment ranges and shows comment content on hover.
- **Sidebar Sync**: Seamlessly navigate between the preview highlights and the comment sidebar.
- **Robust Rendering**: Comment highlights no longer break image tags or other complex Markdown structures.
- **Dedicated Editor**: Edit Markdown with overlay comments.
- **Organization**: Tree and Table views for efficient comment management.

| Feature | Screenshot |
| :--- | :--- |
| Add Comment  | ![AddComment](images/docs/docs-md-preview-add-comment.png) |
| Preview  | ![Preview](images/docs/docs-md-preview-comments-view.png) |
| Inline Editor | ![Editor](images/docs/docs-md-editor-inline-comment-view.png) |
| Tree Views | ![Tree](images/docs/docs-md-comments-pane.png) |
| Table Views | ![Table](images/docs/docs-md-comment-table-pane.png) |
| Edit Tags | ![EditTags](images/docs/docs-md-comment-table-pane-edit-tags.png) |

## 🚀 Usage

1. **Open** a Markdown file (`.md`) in VS Code.
2. **Launch** the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. **Select** `Markdown Comment: Open preview to the Side`.
4. **Comment**: In the preview, select text, right-click, and choose `[Add Comment]`.
5. **Manage**: Click the "💬 Comments" button in the preview to open the sidebar. Click a comment in the sidebar to jump to the highlighted text, or click a highlight to reveal it in the sidebar.

## 💡 Commenting Highlights

- **Tagging**: Categorize comments with custom tags (manage via QuickPick).
- **Column Reordering**: Organize your view by dragging and dropping table headers.
- **Threading**: Post unlimited replies to create focused discussion threads.
- **Status Tracking**: Mark comments as Open, Resolved, etc., to track progress.
- **Rich Tooltips**: Hover over any highlighted text in the preview to see the original comment and its author instantly.
- **Synchronized View**: The preview highlights and the sidebar are fully synchronized, making it easy to track conversations across large documents.


## ⌨️ Commands

| Command | Title | Description |
| :--- | :--- | :--- |
| `markdown-comment.openPreview` | Open Preview | Opens the dedicated preview with comments. |
| `markdown-comment.openPreviewToSide` | Open Preview to the Side | Opens the preview to the side. |
| `markdown-comment.showCommentTable` | Show Comment Table | Opens the Comment Table view. |

## 🔧 Technical Details

- **Non-Invasive**: Comments are stored in a sidecar file (`filename.meta.jsonl`).
- **Clean Data**: Your original Markdown files remain untouched.

## ⚙️ Configuration

Customize the extension via VS Code Settings:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `markdownComment.commentsTable.columns` | `array` | `["lineNo", ...]` | Columns to display in the Comment Table (lineNo, content, status, etc.). |
| `markdownComment.commentsTable.columnWidths` | `object` | `{...}` | Pixel widths for table columns. |
| `markdownComment.defaultAuthor` | `string` | `""` | Default author name (defaults to system user if empty). |

## 🤝 Contribution & Support

Contributions are welcome! If you find this extension useful, please consider supporting its development.

<a href="https://buymeacoffee.com/sun.flat.yamada">
  <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>

## 📝 Release Notes

### 0.0.1
- Initial Release

### Dev Setup
- Node.js 20 or higher is required.
1. `npm install`
2. `npm run compile`
3. `F5` to debug
