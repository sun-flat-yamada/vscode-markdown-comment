---
description: Synchronize documentation with recent code changes
---

# /doc-sync Command

Checks and updates documentation to match code changes.

## Usage

```
/doc-sync [scope]
```

Scope options:
- `all` - Check all documentation (default)
- `readme` - Focus on README.md
- `gemini` - Focus on GEMINI.md
- `recent` - Check only files changed in last commit

## Process

1. Identify code changes
2. Analyze documentation impact
3. Propose necessary updates
4. Apply changes with user approval

## Documentation Checked

- README.md
- GEMINI.md
- Inline code comments
- Workflow documentation
