---
name: github_ops
description: Best practices for GitHub operations and git workflow.
---

# GitHub Operations Skill

This skill defines the mandatory best practices for performing Git and GitHub operations within this repository.

## 1. Safety First: Push with Lease

**RULE**: NEVER use `git push --force` or `-f`.
**RULE**: ALWAYS use `git push --force-with-lease` when updating a remote branch after `amend` or `rebase`.

`--force-with-lease` ensures that you do not overwrite work pushed by others that you haven't fetched yet.

```bash
# BAD
git push --force origin feature/my-branch

# GOOD
git push --force-with-lease origin feature/my-branch
```

## 2. Commit Messages (Conventional Commits)

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Format: `<type>(<scope>): <subject>`

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

### Examples
- `feat(core): add new comment parsing logic`
- `fix(ui): fix sidebar overlap issue`
- `docs(readme): update installation instructions`

## 3. Branch Naming

Use descriptive names with the following prefixes:

- `feature/`: New features
- `fix/`: Bug fixes
- `docs/`: Documentation additions/updates
- `chore/`: Maintenance tasks

Example: `feature/docs-workflow-improvement`
