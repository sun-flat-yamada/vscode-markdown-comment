> [!NOTE]
> This file is a reference. The master document is the English version.
> このファイルは参照用です。正本は英語版です。
> (Automatic translation/sync pending...)
> (自動翻訳/同期待機中...)

# Markdown Comment - Requirements Specification


## 1. Project Overview
**Markdown Comment** is a VS Code extension that provides advanced analysis, commenting, and future refactoring capabilities for Markdown documents. It adopts Clean Architecture to ensure high maintainability and extensibility.

## 2. Target Users
- Writers, developers, and document creators who use VS Code for Markdown editing.
- Users seeking to improve document quality and structural integrity.
- Users who want to leave comments during drafting or review processes without cluttering the original document source.

## 3. Functional Requirements

### 3.1 Document Analysis
- Analyze the structure and readability of the active Markdown document.
- Present analysis results to the user and provide feedback for improvement.

### 3.2 Comment System
- **Context-Aware Comments**: Ability to add comments to specific lines or ranges in the editor.
- **Sidecar Storage**: Comment data is saved in a sidecar file format (`.md.comments.json`) rather than the Markdown file itself. This keeps the document source clean.
- **Metadata**: Each comment retains status (Open, Resolved), author, tags, and timestamps.
- **Modern UI**: Visually clear display using Tag badges and status indicators.

### 3.3 Rich Preview Integration
- Reflect and display comments on the live preview.
- Clicking a comment in the preview jumps to the corresponding location in the editor or shows comment details.

### 3.4 Comments Panel
- List all comments for the current file in a panel (TreeView) within the Explorer sidebar.
- Allow filtering and sorting by comment status or tags (display columns are customizable via settings).

### 3.5 Refactoring Tools (Future Feature)
- Provide refactoring functions to automatically improve Markdown structure.

## 4. Non-Functional Requirements
- **Maintainability**: Separate business logic, persistence, and UI based on Clean Architecture.
- **Testability**: Ensure domain logic and use cases are easily unit-testable.
- **VS Code API Compliance**: Appropriately utilize standard VS Code APIs such as Comment API and WebView API.

## 5. Settings
- `markdownComment.commentsTable.columns`: Customize columns displayed in the comments panel.
- `markdownComment.commentsTable.columnWidths`: Configure the width of each column.
