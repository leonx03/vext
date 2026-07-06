---
name: update-e2e-documentation-and-scripts
description: Workflow command scaffold for update-e2e-documentation-and-scripts in vext.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /update-e2e-documentation-and-scripts

Use this workflow when working on **update-e2e-documentation-and-scripts** in `vext`.

## Goal

Updates E2E documentation and scripts to reflect new flows, runner changes, or research findings.

## Common Files

- `e2e/README.md`
- `e2e/run-e2e.sh`
- `package.json`
- `docs/e2e-research.md`
- `.claude/plans/*.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit e2e/README.md to add flow tables, setup, or runbook updates
- Update or add scripts in e2e/run-e2e.sh or package.json to wire up E2E commands
- Add or update research and planning docs in docs/ or .claude/plans/

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.