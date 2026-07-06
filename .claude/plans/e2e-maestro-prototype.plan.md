# Plan: Automated E2E prototype with Maestro (local-only)

**Source:** `docs/e2e-research.md` (Researcher) + Architect review; decisions confirmed by Leon
**Complexity:** Medium
**Owner (execution):** Builder agent · **Method:** `/tdd-workflow` (flow-level RED→GREEN)

## Summary
Stand up Maestro as the E2E harness for Vext, driving the **existing release APK** on the local
Android emulator — no Metro, no dev-client, no app-code changes. Deliver three flows: **A** tab-smoke
(proves the toolchain), **B** create-exercise (the modal text-entry go/no-go), and **C** existing-data
robustness (proves prior data survives and stays usable). Local-only; CI is explicitly out of scope.

## Confirmed decisions (from Leon)
1. **Framework: Maestro** (black-box, drives the release APK as-is).
2. **CI: local-only prototype first** — no GitHub Actions / device-farm work now.
3. **Modal fallback: SQL-seed preconditions** if Maestro can't type into RN `<Modal>` inputs.
4. **Test data: HYBRID** — `clearState` for clean flows (A, B) **+** an existing-data flow (C) that
   proves nothing breaks when the DB is already populated.

## Ground truth (verified against repo)
- Tabs (visible titles): **Home, Food, Workouts, Agenda, Exercises, Profile** — `app/(tabs)/_layout.tsx`.
- **0 testIDs** in `src/` → Flow A/B rely on visible-text selectors for tabs/labels, point/index taps
  for icon-only controls (the `+` create-exercise button).
- Create-exercise modal: `src/frontend/components/overlay/ExerciseForm.tsx` — full-screen slide modal,
  name `TextInput` + segmented category/tracking `Pressable`s + Save.
- `android/app/build.gradle` present → **no `expo prebuild` needed**; build `:app:assembleRelease` directly.
- Package id `com.anonymous.vext.development`; AVD `vext` (API 36.1). DB `files/SQLite/vext.db`.
- Reuse the hard-won build/emulator lore in `.claude/skills/e2e-test/SKILL.md` (detached gradle build
  + sentinel poll; port-8081 root-held → release APK only).

## Patterns to mirror
| Category | Source | Pattern |
|---|---|---|
| Build/emulator | `.claude/skills/e2e-test/SKILL.md` | Detached `assembleRelease` w/ sentinel; `adb install -r`; monkey launch |
| Selectors | `.claude/skills/e2e-test/SKILL.md` | Text/label first; coordinates only when unavoidable |
| Scripts | `package.json` scripts, `pnpm` only | `pnpm`-based; kebab-case shell scripts |
| Docs | `docs/e2e-research.md` | Self-contained markdown with a runbook |

## Files to change
| File | Action | Why |
|---|---|---|
| `.maestro/config.yaml` | CREATE | Maestro workspace config (appId, flow includes) |
| `.maestro/flows/a-tab-smoke.yaml` | CREATE | Flow A — every tab opens, no crash/blank |
| `.maestro/flows/b-create-exercise.yaml` | CREATE | Flow B — create-exercise modal de-risk (go/no-go) |
| `.maestro/flows/c-existing-data.yaml` | CREATE | Flow C — existing-data robustness (no clearState) |
| `.maestro/subflows/launch-clean.yaml` | CREATE | `clearState` + launch (clean baseline for A/B) |
| `.maestro/subflows/assert-home.yaml` | CREATE | Shared assertion: Home rendered (DRY) |
| `e2e/run-e2e.sh` | CREATE | Runner: tsc gate → emulator → build/install release APK → `maestro test` |
| `e2e/README.md` | CREATE | How to install Maestro + run locally + interpret results |
| `package.json` | UPDATE | Add `e2e` script → `bash e2e/run-e2e.sh` |
| `docs/e2e-research.md` | (already updated by Researcher) | Decisions recorded |

_No `src/` application code changes expected._ If Flow B proves modal typing impossible AND we later
choose testIDs over SQL-seed, that's a separate, explicitly-approved change — **not** in this prototype.

## Tasks (TDD: each flow authored to fail first, then made green)
### Task 0 — Harness bootstrap (prerequisite plumbing, not TDD)
- Install Maestro CLI locally (`curl -Ls "https://get.maestro.mobile.dev" | bash`), record version in `e2e/README.md`.
- Write `.maestro/config.yaml` with `appId: com.anonymous.vext.development`.
- Write `e2e/run-e2e.sh` mirroring the skill's emulator-boot + detached-build + install steps.
- **Validate:** `maestro --version` prints; `bash e2e/run-e2e.sh --build-only` produces & installs the APK.

### Task 1 — Flow A: tab smoke (clearState)
- **RED:** author `a-tab-smoke.yaml` (launch clean → for each tab, `tapOn` the tab title → `assertVisible`
  a signature element of that screen). Run once with a deliberately wrong assertion to confirm the flow
  *can* fail (no-op guard).
- **GREEN:** fix assertions to the real signature text (Home greeting/stats, Food "Nutrition", Workouts
  series/pills, Agenda month grid, Exercises search box, Profile version string). Run → all pass.
- **Mirror:** shared `assert-home` subflow; text selectors.
- **Validate:** `maestro test .maestro/flows/a-tab-smoke.yaml` green on the API-36 `vext` AVD.
  _(This green also answers the API-level contingency — if it fails here, stand up an API-34 AVD.)_

### Task 2 — Flow B: create-exercise modal de-risk (clearState) — **GO/NO-GO**
- **RED:** author `b-create-exercise.yaml`: Exercises tab → tap the `+` (icon-only → point tap or index) →
  `inputText` into the name field → pick a category + tracking → Save → `assertVisible` the new exercise
  in the list. First run expected to reveal the real risk: can Maestro focus the RN `<Modal>` TextInput?
- **GREEN (path 1 — typing works):** finalize; the modal quirk is solved for full-screen modals. Note the
  caveat that transparent modals (EditQuantitySheet/TargetsSheet) still need a separate check later.
- **GREEN (path 2 — typing fails):** per Leon's decision, fall back to **SQL-seed**: seed the exercise row
  via the skill's DB tooling as a precondition, then assert it renders/behaves. Document the coverage
  ceiling (modal text-entry stays manual). Either path yields a green, documented flow.
- **Validate:** `maestro test .maestro/flows/b-create-exercise.yaml` green; record which path was taken.

### Task 3 — Flow C: existing-data robustness (NO clearState)
- **RED:** author `c-existing-data.yaml` to run **after** B without clearing state: launch (warm DB) →
  `assertVisible` the exercise created/seeded in B still present → perform a fresh action over the
  populated DB (e.g. log a body weight on Profile — a non-modal input that types reliably) → assert it
  succeeds and nothing crashes/blanks.
- **GREEN:** tune waits/selectors until stable across two consecutive runs.
- **Validate:** run B then C back-to-back → C green, proving prior data survives and stays usable.
- **Note:** fully deterministic *seed-a-known-DB* isolation (independent of run order) needs either a
  debuggable E2E build variant or a rootable AOSP AVD (`adb root`) — flagged as the next-step contingency,
  not built in the prototype.

### Task 4 — Wire-up + docs
- Add `"e2e": "bash e2e/run-e2e.sh"` to `package.json`.
- `e2e/README.md`: install Maestro, `pnpm e2e`, per-flow run, how to read pass/fail, the modal-typing
  outcome from Task 2, and the seed-DB contingency.
- **Validate:** `pnpm e2e` runs A → B → C end-to-end and reports results.

## Validation (project-specific)
```bash
pnpm exec tsc --noEmit                      # pre-flight gate (from the skill)
maestro --version                            # harness installed
bash e2e/run-e2e.sh                          # full run: emulator → release APK → A,B,C
maestro test .maestro/flows/a-tab-smoke.yaml # individual flow
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Maestro can't type into RN `<Modal>` (Flow B) | Medium | Pre-decided fallback: SQL-seed precondition; document ceiling |
| API 36 AVD unsupported by Maestro | Low–Med | Flow A is the probe; contingency = API-34 `vext-e2e` AVD |
| Icon-only `+` needs coordinate tap (fragile) | Medium | Point/index tap for now; note testID as a future hardening (not this PR) |
| Deterministic DB seeding blocked on non-debuggable release APK | Med | Flow C uses warm-DB (order-based) for the prototype; seed-DB flagged as contingency |
| Emulator flakiness / long gradle build | Med | Detached build + sentinel poll (from skill); waits in flows |

## Acceptance
- [ ] Maestro installed; `pnpm e2e` runs A→B→C on the local emulator against the release APK.
- [ ] Flow A green (tab smoke) — toolchain proven on the real APK.
- [ ] Flow B resolved to a documented green (typing works, or SQL-seed fallback) — modal question answered.
- [ ] Flow C green — existing data survives + stays usable (Leon's robustness requirement).
- [ ] No `src/` app-code changes (or, if any were needed, separately approved).
- [ ] New branch, clean conventional commits, `tsc --noEmit` clean.
- [ ] `e2e/README.md` documents setup, runbook, modal outcome, and the seed-DB contingency.

## Out of scope (documented, not built)
- GitHub Actions / Maestro Cloud / EAS CI integration.
- App-wide testID rollout.
- iOS flows.
- Deterministic seed-a-known-DB isolation (needs debuggable variant or rootable AVD).
