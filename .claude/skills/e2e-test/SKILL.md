---
name: e2e-test
description: >
  Drive the Vext app end-to-end on the Android emulator (or a connected device) and verify the
  most important user flows plus known edge cases, then report pass/fail. Use when the user runs
  /e2e-test, or asks to "e2e test", "run the e2e suite", "smoke test the app", "regression test",
  or verify a change end-to-end on the emulator. Optional arg scopes the run (see Args).
---

# Vext end-to-end test

Build the app from the **current working tree**, run it on the emulator, drive the real UI, and
confirm the important flows + edge cases behave correctly. This is manual-style verification of the
running app — not the (nonexistent) unit-test suite. End state: a clear PASS/FAIL report with
screenshots of key states and DB confirmations where behavior isn't visible in the UI.

## Args

- `/e2e-test` (no arg) → the **default suite**: all P0 cases + the curated P1 cases + the key edge
  cases marked ⭐ below. This is "most important cases and edge cases."
- `/e2e-test full` → every case in this file.
- `/e2e-test <area>` → only that area, e.g. `basics`, `workouts`, `agenda`, `gyms`, `splits`,
  `food`, `bodyweight`, `exercise-types`, `history`, `migration`.

Always tell the user up front which cases you're going to run, then work the list and report.

## Golden rules (read first — these are hard-won)

1. **Tap using `mobile_list_elements_on_screen` coordinates, never positions eyeballed from a
   screenshot.** The screenshot image is scaled down (~928 px wide) but the device is 1080 px and
   taps use real device px — estimating from the screenshot misses by ~15%. Flow: screenshot to
   *see* state → `mobile_list_elements_on_screen` to get a target's ViewGroup, tap its **center**.
2. **RN `<Modal>` text inputs don't focus via synthetic taps on the emulator** (the soft keyboard
   never shows; `mobile_type_keys` then sends a stray BACK that dismisses the modal). Non-modal
   inputs (search bars, the workout-screen set fields, the Profile weight field, the gym "Add a
   gym" field) **do** focus on a normal tap — then `adb shell input text '...'` works (`%s` for
   spaces). For modal inputs, prefer seeding data via SQL (see below), or the TAB-traversal
   workaround (`adb shell input keyevent 61` walks focus order), or just skip the typed step and
   note it. The picker/segmented **buttons** inside modals tap fine — only *text entry* is the
   problem.
3. **Confirm the change under test is actually in the build.** The release APK embeds the JS
   bundle at build time, so always rebuild after code changes before driving.
4. **A blank/error frame or crash is a FAIL** — report it with the screenshot, don't paper over it.
5. Leave the app installed/running at the end unless asked otherwise. Report what you did and
   what you couldn't verify (and why).

## Step 0 — Pre-flight (cheap gate)

```bash
cd /home/leon/src/vext && pnpm exec tsc --noEmit
```
If it fails, stop and report the type errors — no point building a broken bundle.

## Step 1 — Bring up the emulator + app

Package id: `com.anonymous.vext.development`. AVD: `vext`. DB: `files/SQLite/vext.db`.

**Emulator** (skip if `adb devices` already shows `emulator-5554 device`):
```bash
cd /tmp && setsid bash -c '~/Android/Sdk/emulator/emulator -avd vext -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot > /tmp/vext-emu.log 2>&1' &
# poll for boot (run in background, don't block the turn):
for i in $(seq 1 90); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && { echo BOOTED; break; }; sleep 3; done
```
No AVD? See the `android-emulator-testing` memory (create one by hand — no cmdline-tools installed).

**Build the release APK.** The dev-client/Metro path is blocked (host port 8081 is root-held), so
always build a release APK with the JS bundle embedded. If `android/` is missing, first run
`pnpm exec expo prebuild --platform android --clean` (slow). Then, detached (long gradle builds get
reaped if run in the foreground):
```bash
cd /home/leon/src/vext/android
SENT=/tmp/vext-build.sentinel; rm -f "$SENT"
setsid bash -c "./gradlew :app:assembleRelease -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease > /tmp/vext-build.log 2>&1; echo \$? > '$SENT'" &
# poll: while [ ! -f "$SENT" ]; do sleep 5; done ; cat "$SENT" should be 0
```

**Install + launch** (in-place install preserves data → this also exercises the migration):
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.anonymous.vext.development -c android.intent.category.LAUNCHER 1
```

## Step 2 — Driving + inspection toolkit

- **UI:** the `mobile` MCP tools (`mobile_take_screenshot`, `mobile_list_elements_on_screen`,
  `mobile_click_on_screen_at_coordinates`, `mobile_get_screen_size`). Screen is 1080×2340.
- **Typing into non-modal fields:** tap it, verify `adb shell dumpsys input_method | grep mInputShown`
  is `true`, then `adb shell input text 'Some%stext'`; `adb shell input keyevent 67` = backspace.
- **DB read/seed (needs a debuggable build):** the release APK is not debuggable, so `run-as` fails.
  To inspect or seed the DB, temporarily add `debuggable true` to the `release {}` block in
  `android/app/build.gradle` (that dir is gitignored — **revert the edit before finishing**),
  rebuild, reinstall. There is no on-device `sqlite3`; pull the DB (WAL-safe) and use the host one:
  ```bash
  PKG=com.anonymous.vext.development
  adb exec-out run-as $PKG cat files/SQLite/vext.db      > /tmp/v.db
  adb exec-out run-as $PKG cat files/SQLite/vext.db-wal  > /tmp/v.db-wal   2>/dev/null
  adb exec-out run-as $PKG cat files/SQLite/vext.db-shm  > /tmp/v.db-shm   2>/dev/null
  sqlite3 /tmp/v.db "PRAGMA user_version; SELECT ...;"     # host sqlite3 merges the WAL
  ```
  To write back: edit `/tmp/v.db` (run your UPDATEs then `PRAGMA wal_checkpoint(TRUNCATE);`),
  `adb push` it to `/data/local/tmp`, `run-as $PKG cp` it over `files/SQLite/vext.db`, and
  `run-as $PKG rm -f files/SQLite/vext.db-wal files/SQLite/vext.db-shm`. Force-stop the app first.
- **Date-dependent data without root:** `adb shell cmd alarm set-time <epoch_ms>` sets the clock
  (also `settings put global auto_time 0`); log via the UI (the app reads the live clock at
  button-press); then restore with `set-time $(date +%s)000` + `auto_time 1` and force-stop +
  relaunch so the JS re-renders date labels.

See the `android-emulator-testing` memory for the full lore.

---

# The test suite

For each case: set up any preconditions, drive it, screenshot the key state, mark **PASS/FAIL**.
`[P0]` = critical (default suite). `[P1]` = important (default suite). `⭐` = edge case in the
default suite. Others run only on `/e2e-test full` or a scoped run.

## App basics / smoke — `basics`
The fastest sanity pass — catches gross breakage before the deeper cases. Run this first.
- `[P0]` **Every bottom tab opens** with no crash/blank frame: tap each of **Home, Food, Workouts,
  Agenda, Exercises, Profile** and confirm its key content renders:
  - **Home:** greeting, week selector (‹ ›), the stats row (Workouts/Sets/kg), Body Weight card.
  - **Food:** "Nutrition" header, calories + protein remaining, Quick add, Today's log.
  - **Workouts:** the series list (or the "No workouts yet" empty state) + the Splits / History pills.
  - **Agenda:** the month calendar grid + month ‹ › navigation changes the month.
  - **Exercises:** search box, category filter chips, the exercise list.
  - **Profile:** body-weight logger, units toggle, Gyms section, Rest Timer, Import, version string.
- `[P0]` **Bottom-nav switching** keeps state sane (the active tab highlights; going back to a tab
  doesn't crash).
- `[P0]` **Core "add" operations work** (the fundamentals to build on later):
  - Log a body weight on Profile (non-modal field) → it appears in the trend/history.
  - Add a gym on Profile → it shows in the Gyms list.
  - Create a custom exercise (Exercises → `+` → name + category + tracking → Save) → it appears in
    the list and is pickable in a workout.
- ⭐ **Empty states** render (not blank): no workouts, no saved meals, no splits, no history.

## Migration & launch — `migration`
- `[P0]` App launches to Home after an in-place install over existing data (no crash/blank).
- `[P0]` `PRAGMA user_version` equals `APP_CONFIG.database.schemaVersion` in `src/config/app.ts`.
- ⭐ Prior data survives the upgrade: pre-existing body-weight entries, workout series, gyms, and
  foods/meals are all still present after the migration.
- ⭐ New columns backfill sanely (e.g. after v21, existing exercises get `tracking_type='weighted'`).

## Workouts & sets — `workouts`
- `[P0]` **Start a fresh workout:** Start Workout → New Workout → Strength Training → (gym gate) →
  add an exercise → log a `kg × reps` set (tap field, `input text`) → Finish → it appears in the
  Workouts list and in History with the right counts.
- `[P1]` **Repeat past workout:** clones exercises; goes through the gym gate; lands as a new
  in-progress session.
- `[P1]` **Supersets:** Make Superset on an exercise, add a second exercise, log a round, then
  Ungroup — sets are kept.
- `[P1]` Rep-goal editing colors reps (under=amber, in-range=green, over=blue); "Last: …" shows the
  previous session's values for the same series (and is per-gym — see gyms).
- ⭐ **Single active-workout guard:** starting a second workout while one is in progress prompts
  "discard & continue" rather than silently creating two.
- ⭐ Delete the last session in a group closes the detail modal; deleting a group removes it.

## Exercise tracking types — `exercise-types`  (schema v21+)
- `[P1]` In the exercise editor (Exercises tab → tap an exercise → Edit) the **Tracking** picker
  offers Weight × reps / Bodyweight / Time and persists the choice (confirm in DB `tracking_type`).
- `[P0]` **Time exercise** (e.g. set Side Plank → Time): its set row shows a single **Duration (s)**
  field + a ▶/■ **stopwatch**; the rep-goal badge is hidden. Start the stopwatch, wait, stop → the
  seconds fill the field and save (DB `duration_seconds` set). History shows "Ns".
- `[P0]` **Bodyweight exercise** (e.g. set Pull-Up → Bodyweight): its set row shows a free-text
  **Load** field × **Reps**. Enter a non-numeric load like "green band" + reps → saves
  (DB `custom_fields = {"load":"green band"}`, `reps` set). History shows "green band × N reps".
- ⭐ Bodyweight set with load only (no reps) shows just the load; Weight × reps default is
  unchanged for every other exercise.
- Time + AMRAP renders "max hold" in prescriptions; the seeded Plank/Side Plank default to Time and
  Pull-Up/Chin-Up to Bodyweight on a fresh install.

## Gyms & the gym gate — `gyms`  (needs ≥2 active gyms to see the picker)
- `[P0]` With **≥2 active gyms**, starting a workout (fresh, repeat, or from the Agenda) shows the
  **"Which gym?"** picker; the chosen gym is stored on the session.
- ⭐ With **exactly 1 gym**, no picker appears and the session falls back to the default gym.
- ⭐ **Cancelling** the gym picker (tap backdrop/✕) does **not** start a workout.
- Manage gyms in Profile: add, rename, archive (the default gym can't be archived).
- Per-gym memory: "last time" weights/structure resolve from that gym's most recent session; weights
  do not fall back across gyms.

## Agenda & scheduled starts — `agenda`
- `[P0]` A planned (split) entry shows on its day with a **Start** button; tapping Start goes
  **through the gym gate** and instantiates the workout from the series template.
- ⭐ Starting a planned workout with ≥2 gyms prompts for gym (regression: this used to be skipped).
- An already-started planned entry shows "Started" (no Start button); Remove cancels a planned one.
- Scheduling from a day requires at least one completed series ("Complete a workout first…").

## Splits — `splits`
- `[P1]` Apply a split for N cycles from a start date → the correct number of workout days land on
  the Agenda on the right weekdays (rest days skipped); "Scheduled N".
- `[P1]` Clear planned workouts removes the applied entries (net zero).
- Template preview shows notes, alternatives, AMRAP ("× AMRAP" / time "max hold"), and set counts.

## Workout history — `history`
- `[P0]` The History screen (Workouts → History pill) lists completed sessions **newest-done
  first**; empty state when none.
- `[P1]` **Set gym on a done workout:** a session with a gym shows a chip; tapping it opens the gym
  picker and changes it (persists in DB).
- ⭐ A gym-less (legacy `gym_id = NULL`) session shows a dashed **"Set gym"** control; assigning a
  gym persists. (To create one for the test: SQL-set a completed workout's `gym_id = NULL`.)

## Food & macros — `food`
- `[P0]` One-tap log a saved meal from Quick add → daily calories/protein remaining update; delete
  the log entry → totals revert.
- `[P1]` **Manage meals:** each meal row has a pencil **edit** button (and tapping the row edits);
  in the composer, tapping a food opens a **quantity editor** with a live macro preview (composed
  meals); manual-macro meals store fixed totals.
- ⭐ **Snapshot-on-log:** editing or deleting a food/meal does **not** rewrite past log entries
  (their macros are snapshotted at log time).
- Targets (Profile → or Food → Targets) drive the "remaining" numbers; JSON import (Profile → Data)
  is idempotent (upsert by name).

## Body weight — `bodyweight`
- `[P0]` Log a weight on Profile → the Home dashboard "Body Weight" widget shows the **selected
  week's** average and follows the week selector (‹ ›).
- ⭐ A selected week with no entries shows **"No entries this week"**; the delta reads "vs prior
  week".
- Profile shows the most recent week's average (single week, no multi-week list).

---

# Adding new cases later (keep this suite easy to grow)

To add a check, append a bullet to the relevant `## <Area>` section using this shape:

```
- `[P1]` **Short title:** setup → action → **expected observable result**.
```

- **Priority tags:** `[P0]` critical happy path (in default suite) · `[P1]` important (in default
  suite) · `⭐` edge case (in default suite) · **no tag** = only runs on `/e2e-test full` or a
  scoped `/e2e-test <area>`.
- Keep it **imperative and observable** — say what to tap and what should appear. If the result
  isn't visible in the UI, name the DB value/table that confirms it (e.g. `workout_sets.custom_fields`).
- **New feature?** Add a new `## <Feature> — \`<keyword>\`` section, and add `<keyword>` to the
  **Args** list near the top so `/e2e-test <keyword>` can scope to it. Bump the schema note if it
  needs a migration.
- Prefer cases that seed their own preconditions (add a gym, apply a split, SQL-seed a row) so the
  suite is repeatable on any DB state.

# Report format

End with a concise report:

- **Environment:** built from `<branch>` @ `<short-sha or "working tree">`, schema v`<N>`, emulator.
- **Results table:** one row per case run — `AREA · case → PASS/FAIL` (+ one-line note on failures,
  with the failing screenshot referenced).
- **DB confirmations:** any values you checked (e.g. `tracking_type`, `custom_fields`, `user_version`).
- **Not verified:** anything blocked by an emulator limitation (modal typing, etc.) — say so
  explicitly rather than implying it passed.
- If you set `debuggable true` or changed the system clock, confirm you reverted both.
