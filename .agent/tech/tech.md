# Markdown Comment - Technical Architecture & Design


## 1. Technology Stack
- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Text Processing**: `markdown-it` (AST analysis and preview generation)
- **Testing**: Mocha, ts-node
- **Formatting**: ESLint, EditorConfig

## 2. Architecture (Clean Architecture)
This project adopts the following 4-layer structure.

### 2.1 Domain Layer (`src/domain`)
- Contains pure business logic and entities; independent of external libraries or frameworks.
- **Entities**: `MarkdownDocument`, `AnalysisRule`, `Comment`, etc.

### 2.2 Application Layer (`src/application`)
- Defines system use cases.
- Manipulates domain objects to achieve specific goals (analysis, comment storage, etc.).
- Defines repository interfaces (`IRepo`) and does not depend on concrete implementations.

### 2.3 Interface Layer (`src/interface`)
- Mediates between the outside world (VS Code, File System) and application logic.
- `CommandHandler`: Converts command execution from VS Code into use cases.
- `Presenter`: Converts use case results into a format suitable for UI display.

### 2.4 Infrastructure Layer (`src/infrastructure`)
- Concrete implementations such as VS Code API and File System.
- `VSCodeCommentController`: Integration with VS Code Comment API.
- `FileRepository`: Persistence of comment data to `.json` files.
- `VSCodeWebview`: WebView implementation for previews and table displays.

## 3. Data Structure
### Comment Persistence Format (`.md.comments.json`)
```json
[
  {
    "id": "uuid",
    "lineNo": 10,
    "content": "Comment content",
    "status": "open",
    "author": "user_name",
    "tags": ["improvement", "bug"],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

## 4. UI/UX Design Principles
- **Seamless Integration**: Design that harmonizes with standard VS Code gutter and panels.
- **Premium Visual Experience**:
  - Adoption of modern color palettes and typography.
  - Enhancement of interaction via micro-animations.
  - Improved visibility through color coding based on status and tags.
- **Intuitive Operation**: Bi-directional coordination to/from preview and editor.

## 5. Development Workflow
- **TDD (Test Driven Development)**: Create tests prior to or in parallel with logic additions.
- **Documentation Policy**:
  - Ensure `README.md` and `GEMINI.md` are always up to date.
  - English documentation is the master; updates are mandatory when code changes.
