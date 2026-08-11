```markdown
# vext Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and workflows for the `vext` repository, a TypeScript React project. It covers coding conventions, file organization, commit practices, and end-to-end (E2E) testing workflows using Maestro. By following these guidelines, contributors can ensure consistency, maintainability, and high-quality test coverage.

## Coding Conventions

**File Naming**
- Use **kebab-case** for all file and directory names.
  - Example: `user-profile.tsx`, `main-layout/index.ts`

**Import Style**
- Use **relative imports** for internal modules.
  - Example:
    ```typescript
    import { UserProfile } from '../components/user-profile';
    ```

**Export Style**
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // user-profile.tsx
    export function UserProfile() { /* ... */ }
    ```

**Commit Messages**
- Follow **conventional commit** style.
- Common prefixes: `test`, `chore`, `docs`
- Keep commit messages concise (average ~48 characters).
  - Example: `test: add smoke test for login flow`

## Workflows

### Add New E2E Test Flow
**Trigger:** When adding a new end-to-end test scenario using Maestro  
**Command:** `/new-e2e-flow`

1. **Create a new flow YAML file** in `.maestro/flows/`
   - Name it descriptively, e.g., `a-tab-smoke.yaml`, `b-create-exercise.yaml`
2. **(Optional) Create or update subflow YAMLs** in `.maestro/subflows/` for reusable steps
   - Example: `login-subflow.yaml`
3. **Document the new flow** in `e2e/README.md`
   - Add details about the scenario and coverage
4. **Run the E2E runner** to verify the new flow passes
   - Example command: `./e2e/run-e2e.sh a-tab-smoke.yaml`

**Example:**
```yaml
# .maestro/flows/a-tab-smoke.yaml
- launchApp: {}
- runFlow: login-subflow.yaml
- tapOn: "Tab A"
- assertVisible: "Welcome to Tab A"
```

### Update E2E Documentation and Scripts
**Trigger:** When updating E2E flows, runner scripts, or documenting research/decisions  
**Command:** `/update-e2e-docs`

1. **Edit `e2e/README.md`** to update flow tables, setup, or runbook sections
2. **Update or add scripts** in `e2e/run-e2e.sh` or `package.json` for E2E commands
   - Example: Add a new npm script for a specific flow
3. **Add or update research/planning docs** in `docs/` or `.claude/plans/`
   - Example: `docs/e2e-research.md`, `.claude/plans/e2e-strategy.md`

**Example:**
```json
// package.json
"scripts": {
  "e2e:smoke": "./e2e/run-e2e.sh a-tab-smoke.yaml"
}
```

## Testing Patterns

- **Test files** follow the `*.test.*` pattern (e.g., `login.test.tsx`)
- **Testing framework** is not explicitly specified; check test files for details
- Place test files alongside or near the modules they test
- Use descriptive test names and group related tests

**Example:**
```typescript
// login.test.tsx
import { render, screen } from '@testing-library/react';
import { Login } from './login';

test('renders login form', () => {
  render(<Login />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
});
```

## Commands

| Command         | Purpose                                                        |
|-----------------|----------------------------------------------------------------|
| /new-e2e-flow   | Scaffold and document a new Maestro E2E test flow              |
| /update-e2e-docs| Update E2E documentation, scripts, and related research/plans  |
```