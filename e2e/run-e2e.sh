#!/usr/bin/env bash
#
# Vext end-to-end test runner (local-only).
#
# Drives the RELEASE APK on the local Android emulator with Maestro. There is no
# Metro / dev-client / test build in the loop: the release APK embeds the JS
# bundle, and the host's port 8081 is root-held so the dev-client path is blocked
# anyway (see .claude/skills/e2e-test/SKILL.md).
#
# Pipeline: tsc gate -> ensure emulator booted -> build release APK (detached,
# sentinel-polled) -> adb install -r -> `maestro test .maestro/`.
#
# Usage:
#   bash e2e/run-e2e.sh                 # full run: tsc -> build -> install -> all flows (A,B,C)
#   bash e2e/run-e2e.sh --build-only    # tsc -> build -> install, then stop (no flows)
#   bash e2e/run-e2e.sh --no-build      # skip build+install (reuse installed APK), run flows
#   bash e2e/run-e2e.sh <flow.yaml>     # run a single flow (still builds unless --no-build)
#   bash e2e/run-e2e.sh --no-build .maestro/flows/a-tab-smoke.yaml
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="com.anonymous.vext.development"
AVD="vext"
APK="$REPO/android/app/build/outputs/apk/release/app-release.apk"
MAESTRO_BIN="$HOME/.maestro/bin"
EMULATOR="$HOME/Android/Sdk/emulator/emulator"
BUILD_LOG="/tmp/vext-build.log"
SENTINEL="/tmp/vext-build.sentinel"

BUILD_ONLY=0
NO_BUILD=0
FLOW_TARGET="$REPO/.maestro"   # default: the whole workspace (config.yaml scopes to flows/*.yaml)

for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=1 ;;
    --no-build)   NO_BUILD=1 ;;
    -h|--help)    grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)            FLOW_TARGET="$arg" ;;
  esac
done

export PATH="$PATH:$MAESTRO_BIN"

step() { printf '\n==> %s\n' "$1"; }

# --- 1. tsc gate (cheap): no point building a broken bundle -------------------
step "tsc --noEmit (pre-flight gate)"
( cd "$REPO" && pnpm exec tsc --noEmit )

# --- 2. ensure the emulator is booted ----------------------------------------
if adb devices | awk 'NR>1 && $2=="device"{f=1} END{exit !f}'; then
  step "Emulator already running"
else
  step "Booting emulator '$AVD' (headless)"
  ( cd /tmp && setsid bash -c "'$EMULATOR' -avd '$AVD' -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot > /tmp/vext-emu.log 2>&1" & )
  for _ in $(seq 1 90); do
    [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
    sleep 3
  done
  [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] \
    || { echo "ERROR: emulator '$AVD' did not finish booting" >&2; exit 1; }
fi

# --- 3. build the release APK (detached; long gradle builds get reaped in fg) -
if [ "$NO_BUILD" -eq 0 ]; then
  step "Building release APK (detached, sentinel-polled)"
  rm -f "$SENTINEL" "$BUILD_LOG"
  ( cd "$REPO/android" && setsid bash -c "./gradlew :app:assembleRelease -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease > '$BUILD_LOG' 2>&1; echo \$? > '$SENTINEL'" & )
  while [ ! -f "$SENTINEL" ]; do sleep 5; done
  RC="$(cat "$SENTINEL")"
  if [ "$RC" != "0" ]; then
    echo "ERROR: gradle assembleRelease failed (rc=$RC). Last lines:" >&2
    tail -n 30 "$BUILD_LOG" >&2
    exit 1
  fi

  step "Installing release APK (in-place; also exercises the migration)"
  adb install -r "$APK"
fi

# --- 4. build-only stops here -------------------------------------------------
if [ "$BUILD_ONLY" -eq 1 ]; then
  step "--build-only: APK built and installed; skipping flows"
  exit 0
fi

# --- 5. run the flows ---------------------------------------------------------
step "maestro test $FLOW_TARGET"
maestro test "$FLOW_TARGET"
