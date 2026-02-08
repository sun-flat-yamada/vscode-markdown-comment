---
name: issue_driven_development
description: A workflow for issue-driven development, from drafting an issue to PR creation with user checkpoints.
---

# Issue-Driven Development Workflow

This skill defines the standard process for handling development tasks in this repository. It ensures clear requirements, user approval at critical stages, and proper linkage between issues, branches, and pull requests.

## Workflow Steps

### 1. Requirement Analysis & Issue Drafting

- Analyze user requirements and summarize them.
- Create a draft GitHub Issue (usually as an `implementation_plan.md` artifact).
- **DO NOT** make any code changes at this stage.

### 2. User Review (Draft)

- Present the draft to the user for review.
- Refine the draft based on feedback until approved.

### 3. Issue & Branch Creation

- Once the draft is approved:
  - Create the actual GitHub Issue.
  - Create a working branch (e.g., `fix/issue-<number>-<title>`).
  - Link the branch to the issue.
  - Switch to the working branch.
- Prepare the environment (e.g., install dependencies, clean directories).

### 4. Permission to Start Implementation

- **MANDATORY**: Confirm with the user before starting any code changes.
- Wait for user approval to proceed.

### 5. Implementation Phase

- Implement the changes as planned.
- Follow TDD and architecture guidelines.

### 6. Draft Commit Message & Completion Report

- Once implementation is complete:
  - Draft a clear, descriptive commit message.
  - Report the completion and provide the draft message to the user.
  - **DO NOT** commit or push yet. The changes should remain local.

### 7. Iterative Refinement

- Address any additional feedback or instructions from the user.
- Repeat until the user is satisfied.

### 8. Final Approval & PR Creation

- Once the changes and the commit message are finalized and approved:
  - Commit the changes locally.
  - Create a Pull Request (PR) on GitHub.
  - Ensure the PR is linked to the original Issue (e.g., using "Closes #22").

## Best Practices

- **Never skip checkpoints**: User approval is required before starting work and before finalizing changes.
- **Traceability**: Always link branches and PRs to the issue number.
- **Atomic Commits**: If a task is large, coordinate with the user on whether to split it into multiple PRs.
