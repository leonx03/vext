# Automated E2E Testing for Vext — Research & Decision Memo

**Author:** Researcher agent · **Date:** 2026-07-06 · **Status:** decisions recorded (Leon resolved the open items 2026-07-06 — see §5); ready for prototype planning.

> Scope: choose an approach to move Vext's end-to-end verification from the current *manual*
> mobile-MCP flow (`/e2e-test` skill) to an *automated, repeatable* one. This document is research
> only — no application code was changed. Every load-bearing claim is labelled by evidence type
> (**[fact]** sourced, **[repo]** verified against this repository, **[inference]**, **[recommendation]**)
> and freshness-sensitive claims carry the source date.

---

## 1. Executive summary

**Recommend Maestro.** It is the only candidate that satisfies Vext's hardest constraint for free:
it is a black-box, zero-instrumentation driver that runs against **the already-installed release APK**
— exactly the artifact the current flow builds (`./gradlew :app:assembleRelease`) — with no test
build, no Metro, and no dev-client **[fact]**. It is also the tool **Expo itself documents and ships
first-party CI integration for** (EAS Workflows E2E, Maestro Cloud, a Maestro insights dashboard)
**[fact]**, so it will track SDK upgrades. Detox — the obvious alternative — is a *gray-box* framework
that requires compiling its native code into a dedicated test build (so it *cannot* drive the plain
release APK), and on Vext's exact stack (RN 0.81 + New Architecture) it has an open, unresolved
breakage that forces you to disable its headline auto-synchronisation feature **[fact]**. Appium and
"script the mobile-MCP flow" are both viable in theory but are, respectively, far too heavy and too
fragile for a solo hobby project. The one genuine risk with Maestro is **unverified**: whether its
`inputText` command focuses text inputs inside RN `<Modal>` (Vext's known emulator pain point, and
pervasive in this app). That must be de-risked by a 30-minute spike *before* committing — see §6.

**Fallback:** if the modal-input spike fails *and* cannot be worked around, keep the manual
`/e2e-test` skill as the system of record and adopt Maestro only for the non-modal ~70% of the suite
(smoke/navigation/history/bodyweight), rather than adopting Detox.

---

## 2. Constraints recap — confirmed against the repo

All five constraints from the brief were checked against the actual repository, not taken on trust.

| # | Constraint | Verified? | Evidence |
|---|-----------|-----------|----------|
| 1 | **Release-APK path only** (host port 8081 root-held; flow builds a release APK with JS embedded) | ✅ confirmed | `.claude/skills/e2e-test/SKILL.md` builds `:app:assembleRelease` and installs `app-release.apk`; CI (`.github/workflows/build-android.yml`) also only ever produces release APKs via `./gradlew assembleRelease`. No `expo start`/dev-client path in CI. **[repo]** |
| 2 | **RN `<Modal>` text inputs don't focus via synthetic taps** on the emulator | ✅ confirmed | **18 `<Modal>` instances across 16 components; 9 of them contain a `TextInput`** — those 9 are the actual text-entry risk surface: `ExerciseForm`, `ExercisePicker`, `EditQuantitySheet`, `SupersetCard`, `MealComposerSheet`, `FoodFormSheet`, `FoodPickerSheet`, `TargetsSheet`, `ImportSheet`. (The other modals — `ConfirmDialog`, `AlternativesModal`, `SupersetAlternativesModal`, `WeightHistorySheet`, `RestTimer`, `DatePicker`, `SelectPicker` — have no `TextInput`, so the quirk doesn't touch them.) `@gorhom/bottom-sheet` is in `package.json` but has **0 usages in `src/`** (effectively a dead dep). So modal text entry blocks *many* core flows (create exercise, macro editing, targets, import) — pervasive, but across **9** text-input modals, not a corner case. **[repo]** |
| 3 | **New Architecture enabled** (Fabric/TurboModules), RN 0.81.5 | ✅ confirmed | `app.json` → `"newArchEnabled": true`; `android/gradle.properties` → `newArchEnabled=true`; `package.json` → `react-native 0.81.5`, `react 19.1.0`, Expo `~54.0.33`. **[repo]** |
| 4 | **CI already exists** (GitHub Actions builds APKs) | ✅ confirmed | `build-android.yml`: ubuntu-latest, Java 17, Node 20, pnpm 9, `expo prebuild --platform android --clean` then `assembleRelease`. Uploads APK artifact. No emulator/E2E step today. **[repo]** |
| 5 | **Android primary** (AVD `vext`, pkg `com.anonymous.vext.development`); iOS secondary | ✅ confirmed, with a new finding | Package id confirmed in `app.json`. **New:** the `vext` AVD is **API 36.1** (`~/.android/avd/vext.avd/config.ini` → `system-images/android-36.1/...`, x86_64, google_apis_playstore). This matters — see the API-level note under Maestro in §3 and decision 5a.5. **[repo]** |

**Additional repo facts that shape the decision:**
- **Zero `testID`s in the codebase** (`grep -rn testID src/` → 0) and exactly **1 `accessibilityLabel`** **[repo]**.
  This is decisive: Detox is testID-first (would need testIDs added everywhere before it's usable);
  Maestro can fall back to **visible-text selectors**, which the existing `/e2e-test` suite already
  leans on ("Nutrition" header, tab labels, "No workouts yet"). So Maestro can start working with
  **no app-code changes at all**, and testIDs become a *progressive enhancement* rather than a
  prerequisite. **[inference]**
  - **Caveat — text selectors are not a complete *tapping* story [repo/inference].** Several
    load-bearing controls are **icon-only** with no visible text: the `+` create-exercise button, the
    pencil edit button, the week nav ‹ › arrows, the ▶/■ stopwatch. Text selectors can't find these,
    so tapping them falls back to point/index taps — which reintroduces exactly the coordinate
    fragility the manual mobile-MCP flow suffers from. Net: text selectors are solid for **assertions**
    and for the **text-labelled tabs**, but the icon-only controls are the first, highest-value
    candidates for `testID`s (ties into the still-open `testID`-scope item in §5b).
- Tab routes (`app/(tabs)/`): `index` (Home), `food`, `workouts`, `calendar` (Agenda), `exercises`,
  `profile` — matches the smoke case in the skill. **[repo]**
- No test runner, linter, jest, detox, or maestro config exists yet — greenfield. **[repo]**

---

## 3. Options compared

Scored 1–5 (5 = best) against the criteria that matter for *this* project.

| Criterion | Maestro | Detox | Appium | Scripted mobile-MCP |
|---|:---:|:---:|:---:|:---:|
| Drives the **release APK** as-is (constraint #1) | **5** — black-box, `--app-path app-release.apk`, no test build | **1** — gray-box; needs Detox native code compiled into a dedicated build variant | **4** — black-box (UiAutomator2) drives any installed APK | **5** — already does |
| **New Arch / RN 0.81** compatibility (constraint #3) | **4** — black-box, arch-agnostic; no known RN-0.81 issue | **2** — *nominally* supports RN 0.77–0.84+NewArch, but open breakage on 0.81.4+NewArch | **4** — OS-level, arch-agnostic | **5** — arch-agnostic |
| **Modal text input** (constraint #2) | **3 (unverified)** — `inputText`; modal focus not documented, must spike | **3** — `typeText` via instrumentation; RN-Modal focus historically finicky too | **2** — same UIAutomator focus limits as the manual flow | **1** — known-broken (the quirk originates here) |
| **Setup effort** | **5** — one binary, YAML flows, no app changes | **2** — native config, config-plugin, test build, `.detoxrc`, jest runner | **1** — WebDriver server, drivers, capabilities, client lib | **4** — exists, but bespoke |
| **testID / a11y requirement** | **5** — optional (text selectors work now) | **2** — effectively required; 0 exist today | **3** — resource-id/text; some work needed | **5** — none |
| **CI story** | **4** — emulator-on-CI action, or Maestro Cloud / EAS Workflows (Expo first-party) | **3** — emulator-on-CI; heavier build in CI | **2** — heavy, slow, flaky in CI | **1** — needs the MCP server running; not real CI |
| **Expo alignment / longevity** | **5** — Expo documents & ships integration | **3** — community config-plugin only | **2** — generic, no Expo tie-in | **2** — bespoke to this repo |
| **Maintenance burden** | **4** — YAML, readable, low churn | **2** — JS test build tracks RN native churn | **1** — verbose, brittle capabilities | **2** — coordinate drift (see below) |
| **Coexistence with `/e2e-test` skill** | **5** — the skill's cases map 1:1 to flows; skill stays as the spec | **3** — parallel toolchain | **2** — parallel toolchain | **5** — it *is* the skill |

### Maestro — front-runner, verify one thing
- **What it is [fact]:** a black-box mobile UI automation tool. Flows are YAML (`tapOn`, `inputText`,
  `assertVisible`, `runFlow`). It "operates at the accessibility layer", has "zero instrumentation",
  and "tests the final bundled binary" — so it drives whatever app is installed on the device/emulator.
  CLI: `maestro test flow.yaml`, optionally `maestro test --app-path ./app-release.apk flow.yaml`;
  if `--app-path` is omitted it assumes the app is already installed (which is exactly Vext's
  install-then-launch flow). (docs.maestro.dev, retrieved 2026-07-06.)
- **Release APK: yes [fact/inference].** Because it is black-box and instrumentation-free, the *plain
  release APK Vext already builds* is a valid target — no separate test build, no Metro, no dev-client.
  This is the single biggest reason it fits constraint #1. (Expo's own E2E guide builds an `.apk` and
  installs it on an emulator before running flows.)
- **New Arch: effectively a non-issue [inference].** Maestro never links against RN internals, so
  Fabric/TurboModules are invisible to it. No RN-0.81-specific Maestro breakage surfaced in research
  (contrast Detox below).
- **testID vs text [fact/repo]:** `testID` maps to Maestro's `id`; text selectors also work but are
  "brittle" if copy/translations change. Vext has **0 testIDs**, so the first flows use text selectors
  (fine for the smoke suite). Adding testIDs later hardens the suite — a progressive enhancement, not
  a blocker.
- **Modal text input: THE open risk [inference, unverified].** Maestro docs show `tapOn`+`inputText`
  but say **nothing** about RN `<Modal>` focus behaviour. The manual flow's failure mode was
  `mobile_type_keys` sending a stray BACK that dismisses the modal; Maestro's `inputText` uses a
  different keyboard mechanism and *may* behave better, but this is **unproven on Vext**. Given
  constraint #2 is pervasive here (9 text-input modals), this must be the first thing the prototype validates.
  If it fails, known escapes: seed data via SQL (the skill already documents this), the TAB-traversal
  keyevent workaround, `maestro`'s `inputText` after an explicit focus, or Maestro's key-event
  primitives. Do **not** adopt Maestro app-wide until this is answered.
- **API-level caveat [fact/repo]:** Maestro's supported Android API levels were reported as
  29/30/31/33/34 with "API 35 and 36 support arriving Q2 2026" (search result, 2026). Vext's `vext`
  AVD is **API 36.1**. As of today (2026-07) that support window should be open, but it is *right at
  the edge*. This needs no separate step to check: **the prototype's Flow A directly answers whether
  Maestro drives the existing API-36 `vext` AVD.** Only *if Flow A fails on API 36* is a dedicated
  API-34 AVD needed, as a contingency. See decision 5a.5.
- **CI [fact]:** three paths — (a) run Maestro on a GitHub-Actions emulator
  (`reactivecircus/android-emulator-runner`) after the existing `assembleRelease`; (b) **Maestro Cloud**
  (paid device farm); (c) **EAS Workflows**, where Expo runs Maestro next to builds and surfaces
  flake in a dashboard. For a solo hobby app, start local-only; add (a) later.

### Detox — capable, but the wrong fit for *this* stack
- **Gray-box = needs a test build [fact].** Detox links its own native code into the app and drives it
  via Espresso/EarlGrey, which means you must produce a **dedicated Detox-instrumented build variant**
  — it cannot drive Vext's existing plain release APK. On Expo this means a community config plugin
  (`@config-plugins/detox`) plus a custom build. That directly fights constraint #1 and adds a whole
  parallel build path.
- **RN 0.81 + New Arch breakage [fact]:** Detox's README states support for RN **0.77–0.84 with the
  New Architecture**. But wix/Detox **issue #4842** (opened 2025-10-01, labelled *stale*, no maintainer
  resolution in-thread) reports a `NullPointerException` in `NetworkIdlingResource` on **RN 0.81.4 +
  New Arch**; the only workaround is `launchArgs: { detoxEnableSynchronization: 0 }` — which disables
  Detox's flagship automatic idle/network synchronisation, forcing manual waits and defeating much of
  the reason to choose Detox over Maestro. Issue #4832 separately reports Android + New Arch failing in
  CI (2025-09). These are on Vext's *exact* RN line.
- **testID-first [repo]:** Detox selectors are testID-centric; with 0 testIDs today, you'd instrument
  the app before the first test runs.
- **Verdict:** more powerful (true synchronisation, JS-level control) but its strengths are neutralised
  on this stack, and its costs (test build, native churn, testIDs, the 0.81 bug) all land squarely on
  Vext's constraints. Not recommended.

### Appium — too heavy
- Black-box WebDriver via the UiAutomator2 driver; *can* drive the release APK (a point in its favour).
  But it means running an Appium server, installing drivers, writing verbose capability configs and a
  client (JS/Python), and it inherits the **same UIAutomator text-focus limitations** as the manual
  flow for RN modals. Slow and flaky in CI. For a solo hobby project this is disproportionate. Not
  recommended.

### Scripting the mobile-MCP flow — baseline, not a solution
- It already works and needs no new tooling, but it is **coordinate-based** — the skill itself warns
  that screenshots are scaled ~928px vs 1080px device px, so taps are eyeballed and drift with any
  layout change. There's no assertion framework, no headless CI path (it needs the MCP server + a
  model in the loop), and the modal-input quirk originates here. Good as the *human-driven* regression
  pass; not an automation target. **Keep it as the spec/oracle, not the engine.**

---

## 4. Recommendation

**Primary: Maestro**, adopted incrementally.
1. Spike the modal-input question first (§6) — this is a go/no-go gate.
2. Author flows under `.maestro/` that mirror the `/e2e-test` skill's cases (the skill becomes the
   human-readable spec; Maestro flows are the executable form). Start with text selectors.
3. Run locally against the existing `app-release.apk` on the emulator.
4. Later: add `testID`s to the components the flows touch (hardening), then wire a CI job.

*Rationale:* it is the only option that honours constraint #1 with zero app changes, sidesteps the
New-Arch/RN-0.81 risk that actively bites Detox, needs no testIDs to start, and is the path Expo
maintains — so it ages well across SDK bumps. The suite already exists in prose; Maestro flows are a
near-mechanical translation.

**Fallback: partial Maestro + retain manual skill.** If the modal spike fails and no workaround is
acceptable, use Maestro only for the modal-free majority of the suite (basics/navigation, history,
bodyweight display, agenda navigation, empty states) and keep `/e2e-test` (manual, with SQL seeding)
as the system of record for modal-heavy flows. This still automates the highest-frequency smoke pass.
Do **not** fall back to Detox — it does not clear constraint #1 or the 0.81+NewArch risk.

---

## 5. Decisions made & still-open items

Leon resolved the open decisions on **2026-07-06**. Resolutions are recorded below; the genuinely
still-open items follow.

### 5a. Decisions made (resolved by Leon, 2026-07-06)

1. **Framework: Maestro. ✅ Confirmed.** The research was not close — it's the clear fit. Full adoption
   is gated only by the modal-input spike (§6), not by the framework choice.
2. **CI: local-only prototype first. ✅** Get Maestro green locally on the emulator before any CI or
   device-farm work. **Defer** the GitHub-Actions-emulator job and Maestro Cloud / EAS Workflows until
   the local flows are stable.
3. **Modal text-entry fallback: SQL-seed preconditions. ✅** If Maestro's `inputText` can't focus RN
   `<Modal>` `TextInput`s, fall back to **seeding data via SQL** — reuse the DB pull/seed tooling
   already documented in `.claude/skills/e2e-test/SKILL.md` — and cover modal *typing* manually. This
   keeps flows deterministic; the trade-off is the acknowledged coverage ceiling in decision 6.
4. **Test-data isolation: HYBRID. ✅ (important nuance)** Not `clearState`-only. The strategy is:
   - **Default = `clearState` / reinstall per run** for deterministic *create/smoke* flows (so
     "create exercise" doesn't fail on rerun because the row already exists).
   - **PLUS dedicated seeded-existing-data flows that prove nothing breaks against pre-populated data:**
     (a) the **migration-preservation** case — in-place install over an existing DB, and prior data
     (body-weight entries, series, gyms, foods/meals) still present after migration; and (b) **at least
     one flow exercising an already-populated DB** — e.g. existing exercises/workouts render and remain
     usable. These want the *opposite* setup from clean flows, so the harness needs **both** a
     clean-slate mode and a seeded-DB mode. The migration flow gets a dedicated pre-seeded/legacy DB
     fixture.
5. **Emulator API level: contingency only. ✅** The prototype's **Flow A** on the existing API-36
   `vext` AVD answers whether Maestro drives it — no separate step. A dedicated **API-34** `vext-e2e`
   AVD is a fallback *only if Flow A fails on API 36* (cost = maintaining a second system-image; there's
   no production device to drift from — emulator-only hobby app).
6. **DB-confirmation coverage ceiling: acknowledged. ✅** Maestro is pure-UI and **cannot read the DB**;
   the release APK isn't debuggable so `run-as` fails without the temporary `debuggable true` hack. So
   the `[P0]` cases that assert **non-visible DB values** (`duration_seconds`, `custom_fields`,
   `user_version`, `tracking_type`) **stay manual** under the `/e2e-test` skill. This is an accepted
   limitation, not a gap to paper over. (A debuggable E2E variant remains a future option if the manual
   burden becomes painful — see 5b.)

### 5b. Still open (defer; decide as the suite matures)

- **`testID` scope.** Not required to start (text selectors + the SQL-seed fallback carry the first
  flows), but the **icon-only controls** (`+`, pencil, ‹ ›, ▶/■) that text selectors can't target
  (§2 caveat) will need testIDs. Recommendation: incremental — add a testID when a flow that touches a
  control is flaky or the control is icon-only. This is the one change that touches **application code**,
  so it still needs an explicit go-ahead before the Builder edits components.
- **Flakiness / retry policy.** Decide once flows exist: per-flow `retry` locally; in CI (when it
  arrives) rerun-once-then-fail and quarantine chronically flaky flows rather than disabling the gate.
- **CI secrets / signing.** Moot while CI is deferred (decision 2). When CI is added, recommendation is
  E2E builds use the **debug keystore** (no release signing needed just to drive the UI), keeping
  `RELEASE_KEYSTORE_*` scoped to real releases; a Maestro Cloud / EAS token would only be needed for
  path (c).
- **Flow location & trigger.** Proposed `.maestro/` at repo root (Expo convention) with a `pnpm e2e`
  script wrapping "install release APK → `maestro test .maestro/`". Confirm at build time.

---

## 6. Proposed prototype scope (minimal first working E2E)

Two flows, chosen to (a) prove the toolchain end-to-end and (b) *immediately* de-risk the one unknown.

**Flow A — `app-basics` smoke (no modal typing; proves the happy path).**
Mirrors the skill's `[P0]` "every bottom tab opens" case. Launch the installed release APK; for each
of Home / Food / Workouts / Agenda / Exercises / Profile: `tapOn` the tab, `assertVisible` a known
text anchor from the skill (Home "Body Weight"; Food "Nutrition"; Workouts the series list or
"No workouts yet"; Agenda the month grid; Exercises the search box; Profile the version string).
Pure taps + assertions on visible text — no testIDs, no text entry. This is the "does Maestro even
drive our release APK on this AVD" proof.

**Flow B — `create-exercise` (the modal-input de-risk; the real test of the approach).**
Mirrors the skill's "create a custom exercise" `[P0]` case: Exercises → `+` → **type a name into the
RN `<Modal>` input** → pick category + tracking → Save → `assertVisible` the new exercise in the list.
This deliberately exercises constraint #2. Outcome determines everything: **pass** → adopt Maestro
app-wide; **fail** → apply the decision-5a.3 fallback (SQL-seed preconditions, modal typing manual) and re-scope.

> **Caveat — don't over-generalise from one modal.** `ExerciseForm` (the create-exercise modal) is a
> **full-screen slide modal** (`animationType="slide"`). A green Flow B proves text entry works into
> *full-screen* modals only; **transparent overlay** modals with inputs (e.g. `EditQuantitySheet`,
> `TargetsSheet`) may focus differently. The spike should therefore also poke **one transparent-overlay
> modal input** before declaring RN-modal text entry universally solved — otherwise a "pass" could
> mask a class of modals that still fails.

**Definition of done for the spike:** Flow A green locally against `app-release.apk` on the emulator;
a clear pass/fail verdict on Flow B's text entry into the **full-screen** create-exercise modal; **and**
a pass/fail on text entry into **one transparent-overlay modal** (`EditQuantitySheet` or `TargetsSheet`)
— all written up with the exact `maestro` version and AVD API level used.

**Deliberately deferred:** CI wiring, testID instrumentation, iOS, and the deeper suite areas
(gyms/splits/food/history/migration) — all straightforward once A+B settle the toolchain and the
modal question.

---

## 7. References

Consulted 2026-07-06. Versions/dates noted where the source carried them.

**Expo (primary/vendor):**
- Expo Docs — *Run E2E tests on EAS Workflows with Maestro*: https://docs.expo.dev/eas/workflows/examples/e2e-tests/ (builds an `.apk`/`.app`, installs on emulator/simulator, runs Maestro flows; supports local Maestro-CLI runs too).
- Expo Docs — *Maestro insights* (EAS dashboard surfacing flow flake/failures): https://docs.expo.dev/eas-insights/maestro/
- Expo Blog — *Expo now supports Maestro Cloud testing in your CI workflow*: https://expo.dev/blog/expo-now-supports-maestro-cloud-testing-in-your-ci-workflow
- Expo Docs — *React Native's New Architecture*: https://docs.expo.dev/guides/new-architecture/
- EvanBacon/expo-router-maestro-test (first-party example): https://github.com/EvanBacon/expo-router-maestro-test

**Maestro (primary/vendor):**
- Maestro Docs — *React Native support* (testID→id mapping, text selectors "brittle", `inputText`, "accessibility layer", "zero instrumentation", "tests the final bundled binary"): https://docs.maestro.dev/get-started/supported-platform/react-native
- Maestro Docs — *Android* (`--app-path`, "assumes app already installed", supported API levels 29/30/31/33/34, API 35/36 "arriving Q2 2026"): https://docs.maestro.dev/get-started/supported-platform/android and https://docs.maestro.dev/getting-started/build-and-install-your-app/android
- Maestro CLI reference: https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli
- Maestro repo: https://github.com/mobile-dev-inc/maestro

**Detox (primary + issue tracker):**
- wix/Detox repo & README (RN 0.77–0.84 + New Arch support statement): https://github.com/wix/Detox
- Detox — *Environment Setup*: https://wix.github.io/Detox/docs/introduction/environment-setup/
- **Issue #4842** — Detox tests fail on **RN 0.81.4 + New Arch** (`NullPointerException` in `NetworkIdlingResource`; workaround = disable synchronisation; opened 2025-10-01, stale, unresolved): https://github.com/wix/Detox/issues/4842
- **Issue #4832** — Detox Android + New Arch failing in CI (2025-09): https://github.com/wix/Detox/issues/4832

**Community / how-to (secondary, corroborating):**
- Lingvano — *Native E2E testing with Expo, RN and Maestro*: https://medium.com/lingvano/in-5-steps-to-native-e2e-testing-with-maestro-and-expo-14e9e9b0f0fe (+ https://github.com/lingvano/react-native-eas-maestro)
- Ibrahim Hajjaj — *E2E with Maestro without EAS/managed services*: https://medium.com/@ibrhajjaj/how-to-run-end-to-end-e2e-testing-in-an-expo-react-native-app-using-maestro-without-relying-on-c9bf2051dfb4
- Raine.run — *Reliable E2E Testing in RN: a Maestro guide for Expo apps*: https://www.raine.run/insights/reliable-e2e-testing-react-native-maestro-expo
- BrowserStack — *Testing RN apps with Maestro*: https://www.browserstack.com/guide/how-to-test-react-native-with-maestro

**Repository (ground truth, this repo, 2026-07-06):**
- `package.json` (Expo ~54.0.33, RN 0.81.5, React 19.1.0), `app.json` (`newArchEnabled: true`, pkg `com.anonymous.vext.development`), `android/gradle.properties` (`newArchEnabled=true`), `.github/workflows/build-android.yml` (release-only APK build), `.claude/skills/e2e-test/SKILL.md` (manual suite + release-APK flow + modal-input quirk), `~/.android/avd/vext.avd/config.ini` (API 36.1). `grep`: 0 `testID`, 1 `accessibilityLabel`, **18 `<Modal>` instances across 16 components (9 contain a `TextInput`)**, 0 `@gorhom/bottom-sheet` usages in `src/`.

---

### Evidence-boundary note
The framework *capabilities and compatibility* claims are **sourced facts** from vendor docs and the
Detox issue tracker. The *fit-to-Vext* judgements (release-APK suitability, New-Arch being a non-issue
for a black-box tool, testIDs being optional-to-start) are **inference** from those facts plus the repo
state. The **one material uncertainty** is Maestro's behaviour with RN `<Modal>` text inputs on this
emulator — explicitly unverified, and the reason §6 exists. The recommendation matches the research
mode: a comparison that ends in a ranked decision with a gated prototype.
