---
name: add-new-e2e-test-flow
description: Workflow command scaffold for add-new-e2e-test-flow in vext.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-e2e-test-flow

Use this workflow when working on **add-new-e2e-test-flow** in `vext`.

## Goal

Adds a new Maestro E2E test flow to the project, including reusable subflows if needed.

## Common Files

- `.maestro/flows/*.yaml`
- `.maestro/subflows/*.yaml`
- `e2e/README.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create a new flow YAML file in .maestro/flows/ (e.g., a-tab-smoke.yaml, b-create-exercise.yaml, c-existing-data.yaml)
- Optionally create or update subflow YAMLs in .maestro/subflows/ for reusable steps
- Document the new flow and its coverage in e2e/README.md
- Run the E2E runner to verify the new flow passes

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.