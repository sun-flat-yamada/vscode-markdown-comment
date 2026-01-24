# CLAUDE.md Example

This is an example project-level configuration file for Claude Code / AI assistants.

## Project Overview

**Markdown Comment** is a VS Code extension built with **Clean Architecture**.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/domain` | Pure business logic and entities |
| `src/application` | Use cases and interface definitions |
| `src/interface` | Adapters (command handlers, presenters) |
| `src/infrastructure` | VS Code API implementations |

## Quick Reference

| Task | Command |
|------|---------|
| Build | `npm run compile` |
| Watch | `npm run watch` |
| Unit Tests | `npm run test:unit` |
| Integration Tests | `npm run test:integration` |
| Package | `npm run package` |

## Rules

1. **Architecture**: Follow Clean Architecture dependency rules
2. **TDD**: Write failing tests before implementation
3. **Documentation**: Update docs when code changes
4. **Language**: Respond in Japanese

## Agent Configuration

See `.agent/` directory for:
- `rules/` - Always-follow guidelines
- `skills/` - Domain expertise
- `agents/` - Subagent definitions
- `commands/` - Slash commands
- `hooks/` - Automated triggers
- `workflows/` - Development workflows
