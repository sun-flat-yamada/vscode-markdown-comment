---
name: markdown_expert
description: Expertise in Markdown structure, AST analysis, and common formatting patterns.
---

# Markdown Expert Skill

Use this skill when analyzing, refactoring, or generating Markdown content.

## Domain Knowledge
- **Structure**: Markdown consists of Blocks (Headers, Paragraphs, Lists) and Inline elements (Links, Emphasis, Code).
- **AST**: Common parsers like `remark` or `markdown-it` represent Markdown as a tree.
- **Rules**:
  - Ensure headers follow a logical hierarchy (no skipping levels).
  - Use consistent list marker styles (`-` or `*`).
  - Validate link syntax and reference-style links.

## Task Guidance
- When asked to analyze a document, focus on:
    - Reading difficulty.
    - Structural consistency.
    - Potential for refactoring (e.g., long sections into sub-headers).
- When implementing "Clean Architecture" for Markdown, keep the **Domain** entities (e.g., `MarkdownDocument`, `MarkdownSection`) pure and agnostic of any specific parser if possible.
