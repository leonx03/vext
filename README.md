# Vext

A fitness tracking app built with React Native and Expo. Track workouts, log sets, monitor progress, and manage exercises.

## Features

- **Workout Tracking** - Start workouts by type (Strength Training, etc.), add exercises, log sets with weight/reps or duration/distance
- **Exercise Library** - Browse default exercises by category and muscle group, create custom exercises, edit or archive any exercise
- **Rep Range Goals** - Set target rep ranges (e.g. 8-12) per exercise in a workout with color-coded feedback
- **Rest Timer** - Configurable rest timer per exercise, auto-starts after saving a set
- **Workout History** - View completed workouts, continue/reopen past workouts
- **Progress Dashboard** - Today's stats, weekly stats, streaks, recent workouts
- **Repeat Workouts** - Quickly repeat a previous workout with the same exercises and set structure
- **Previous Set Display** - See what you lifted last time for each exercise

## Tech Stack

- **Framework:** Expo SDK 54 with React Native 0.81 (New Architecture enabled)
- **Language:** TypeScript (strict mode)
- **Navigation:** expo-router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **Database:** expo-sqlite with manual migrations
- **State Management:** React Query (server state), Zustand (client state)
- **Animations:** react-native-reanimated 4.x
- **Charts:** victory-native

## Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Android Studio with SDK 36 and NDK 27.1.x (for Android builds)
- Xcode (for iOS builds, macOS only)

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd vext

# Install dependencies
pnpm install

# Start the Metro dev server
pnpm start

# Start with cache cleared (useful after dependency changes)
pnpm start -- --clear
```

## Running on Device

### Android

```bash
# Build and run debug APK (requires Android SDK)
pnpm android
```

This builds the native Android app and launches it on a connected device or emulator.

### iOS

```bash
# Build and run on iOS simulator (macOS only)
pnpm ios
```

## CI / Releases

GitHub Actions automatically builds Android APKs. The workflow is in `.github/workflows/build-android.yml`.

| Trigger | Environment | APK type |
|---|---|---|
| Push to `master` | Test | Debug APK (artifact) |
| Manual "Run workflow" | Staging | Release APK (artifact) |
| Push tag `v*` | Production | Release APK + GitHub Release |

### Creating a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds a release-signed APK, creates a GitHub Release with auto-generated notes, and attaches the APK for download.

### Release signing

Release builds are signed with a keystore stored as a GitHub Secret (`RELEASE_KEYSTORE_BASE64`). The Expo config plugin `plugins/withReleaseSigning.js` injects the signing config during `expo prebuild`. Locally, release builds fall back to the debug keystore.

### Local release build

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Project Structure

```
vext/
  app/                          # expo-router file-based routes
    (tabs)/                     # Tab navigation
      index.tsx                 # Home / Dashboard
      workouts.tsx              # Workout history
      exercises.tsx             # Exercise library
      progress.tsx              # Progress & stats
      profile.tsx               # Settings
    workout/
      [id].tsx                  # Active workout screen
      new.tsx                   # Start new workout
    _layout.tsx                 # Root layout (providers, SafeArea)
  src/
    frontend/                   # UI layer
      components/               # Reusable components
        overlay/                # Modals & pickers (ExercisePicker, ExerciseForm, ConfirmDialog)
        workout/                # Workout components (ExerciseCard, SetRow, WorkoutCard, etc.)
      hooks/                    # React Query hooks, custom hooks
      lib/                      # Query client, utils (cn helper)
    backend/                    # Data layer
      models/                   # Database models (workout, exercise, workoutExercise, workoutSet)
      services/                 # Business logic (workoutService, exerciseService, progressService)
      store/                    # Zustand stores (settings)
      database/                 # Migrations
    shared/                     # Shared types, constants, utils
      types/                    # TypeScript interfaces (Exercise, Workout, WorkoutSet, etc.)
      utils/                    # Validation, formatting helpers
    config/                     # App configuration (schema version, defaults)
  global.css                    # Tailwind base/components/utilities
  tailwind.config.js            # NativeWind/Tailwind configuration
```

## Architecture

### Path Aliases

Defined in `tsconfig.json`:

- `@frontend/*` -> `src/frontend/*`
- `@backend/*` -> `src/backend/*`
- `@shared/*` -> `src/shared/*`
- `@config/*` -> `src/config/*`

### Database

Uses expo-sqlite with manual schema migrations managed via `PRAGMA user_version`. Migrations are defined in `src/backend/database/migrations.ts`. The current schema version is tracked in `src/config/app.ts`.

### Styling Conventions

- Use NativeWind `className` props, never inline `style={{}}` for static styles
- Use `cn()` helper from `@frontend/lib/utils` for conditional classes
- SafeAreaView is handled in the root layout - do not add it in screens
- Use `contentContainerClassName` for ScrollView/FlatList content styling

### Data Flow

1. **Models** (`src/backend/models/`) - Raw SQL queries, row mapping
2. **Services** (`src/backend/services/`) - Business logic, validation
3. **Hooks** (`src/frontend/hooks/`) - React Query mutations/queries wrapping services
4. **Components** - UI consuming hooks

## Importing Food Data

Bulk-add foods, saved meals, and daily targets by pasting a JSON object into **Profile → Data → Import from JSON**. The import is **idempotent** — foods and meals are matched by name (case-insensitive) and updated in place, so running it more than once never creates duplicates. It runs in a single transaction; if a meal references a food that doesn't exist, the whole import aborts with an error and nothing is written. There is no seeded/personal food data in the app — the data is whatever you paste.

All three top-level keys are optional:

```json
{
  "targets": { "calories": 2000, "protein": 165 },
  "foods": [
    { "name": "Chicken breast", "serving": 100, "unit": "g", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6 },
    { "name": "Egg", "serving": 1, "unit": "unit", "calories": 72, "protein": 6.3, "carbs": 0.4, "fat": 5 }
  ],
  "meals": [
    {
      "name": "Chicken & rice",
      "components": [
        { "food": "Chicken breast", "amount": 150 },
        { "food": "White rice", "amount": 200 }
      ]
    },
    { "name": "Pizza night", "calories": 750, "protein": 40, "carbs": 70, "fat": 30 }
  ]
}
```

| Field | Notes |
|---|---|
| `targets.calories` / `targets.protein` | Daily targets (kcal / grams of protein). |
| `foods[].name` | Required; the unique key used for the idempotent upsert (case-insensitive). |
| `foods[].serving` | The amount the macros are given for. Optional, defaults to `100`. |
| `foods[].unit` | `"g"`, `"ml"`, or `"unit"`. Optional, defaults to `"g"`. |
| `foods[].calories` / `protein` / `carbs` / `fat` | Macros **per `serving`** (calories are kcal; protein/carbs/fat are grams). |
| `meals[].name` | Required; unique key for the idempotent upsert. |
| `meals[].components` | Present ⇒ a **composed** meal whose totals are derived from its foods. Each `{ "food", "amount" }` references a food by `name`; `amount` is in that food's `unit` (grams, or number of units for a `"unit"` food). |
| `meals[].calories` / `protein` / `carbs` / `fat` | Present with **no** `components` ⇒ a **manual** meal with fixed totals. |

A `components[].food` must exist either in the same import or already in the app.

## Development Guide

### Adding a New Exercise Field

1. Add column in a new migration in `src/backend/database/migrations.ts`
2. Bump `schemaVersion` in `src/config/app.ts`
3. Update the model in `src/backend/models/exercise.ts`
4. Update the type in `src/shared/types/exercise.ts`
5. Update the service in `src/backend/services/exerciseService.ts`
6. Update `ExerciseForm.tsx` UI

### Adding a New Workout Feature

1. Add model method in `src/backend/models/`
2. Add service method in `src/backend/services/workoutService.ts`
3. Add React Query hook in `src/frontend/hooks/useWorkout.ts`
4. Wire up in the active workout screen `app/workout/[id].tsx`

### Troubleshooting

**Styling broken / white screen:**
```bash
pnpm start -- --clear
```

**Native build fails after dependency changes:**
```bash
rm -rf android/app/.cxx android/app/build android/build
pnpm android
```

**Full clean rebuild:**
```bash
rm -rf node_modules android/app/.cxx android/app/build android/build .expo
pnpm install
pnpm android
```

## Package Manager

This project uses **pnpm**. Do not use npm or yarn.

- `pnpm install` - Install dependencies
- `pnpm start` - Start dev server
- `pnpm android` - Build and run on Android
- `pnpm ios` - Build and run on iOS
