# Vext E2E (Maestro, local-only)

Automated end-to-end tests that drive the **release APK** on the local Android
emulator with [Maestro](https://maestro.dev). Black-box, zero-instrumentation:
no Metro, no dev-client, no test build, and **no application-code changes**
(0 `testID`s in `src/`). This complements the manual `/e2e-test` skill, which
remains the system of record for checks that need DB inspection.

See `docs/e2e-research.md` for why Maestro was chosen and
`.claude/skills/e2e-test/SKILL.md` for the emulator/build lore this reuses.

## Environment (validated against)

- **Maestro:** 2.6.1
- **Emulator/AVD:** `vext` — Android **API 36.1** (x86_64, google_apis_playstore)
- **App id:** `com.anonymous.vext.development`
- **DB:** `files/SQLite/vext.db`

## Install Maestro (one time)

Maestro is a single self-contained CLI (needs Java, which the repo already uses).
The upstream one-liner is `curl -Ls "https://get.maestro.mobile.dev" | bash`.
That installer just downloads the versioned `maestro.zip` GitHub release and
unpacks it to `~/.maestro`; you can do the same explicitly:

```bash
curl --fail -L "https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip" \
  -o /tmp/maestro.zip
mkdir -p ~/.maestro && unzip -qo /tmp/maestro.zip -d /tmp/maestro-unpack
cp -rf /tmp/maestro-unpack/maestro/* ~/.maestro/
export PATH="$PATH:$HOME/.maestro/bin"   # add to your shell profile to persist
maestro --version                         # -> 2.6.1
```

The runner (`e2e/run-e2e.sh`) adds `~/.maestro/bin` to `PATH` for its own run, so
you don't need it on `PATH` globally to use `pnpm e2e`.

## Run

```bash
pnpm e2e                                  # full: tsc -> build -> install -> flows A,B,C
bash e2e/run-e2e.sh --build-only          # build + install the release APK only
bash e2e/run-e2e.sh --no-build            # reuse the installed APK, run all flows
bash e2e/run-e2e.sh --no-build .maestro/flows/a-tab-smoke.yaml   # one flow, no rebuild
```

`run-e2e.sh` boots the `vext` emulator headless if it isn't already running.

## Flows

Flows live in `.maestro/flows/`; reusable building blocks in `.maestro/subflows/`.
`.maestro/config.yaml` scopes `maestro test .maestro/` to `flows/*.yaml` (so the
subflows are not run standalone) and the a/b/c filename order is the run order.

| Flow | State | What it proves |
|------|-------|----------------|
| `a-tab-smoke` | clearState | Every bottom tab opens and renders its signature content. |
| `b-create-exercise` | clearState | Maestro can type into the RN full-screen `<Modal>` (name field), pick category/tracking, save, and the new exercise appears in the list. Proves the modal-text-entry go/no-go by UI typing (no SQL-seed fallback needed). |
| `c-existing-data` | warm DB (no clearState) | Runs after `b`: prior data survives a warm launch (the created exercise is still listed) and a fresh write over the populated DB succeeds (logs a body weight on Profile). |

## Reading results

Maestro prints one line per step (`COMPLETED` / `FAILED`) and exits non-zero on
the first failure. On failure it writes a screenshot + UI hierarchy under
`~/.local/state/maestro/tests/<timestamp>/` — open the `screenshot-❌-*.png` to
see the exact frame.
