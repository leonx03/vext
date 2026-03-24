/** Database migrations - schema versioning via PRAGMA user_version with sequential upgrades. */
import * as Crypto from 'expo-crypto';
import type * as SQLite from 'expo-sqlite';
import { APP_CONFIG } from '@config/app';

type Migration = (db: SQLite.SQLiteDatabase) => Promise<void>;

const migrations: Migration[] = [
  // v0 -> v1: Initial schema
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        fields TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        primary_muscles TEXT NOT NULL,
        equipment TEXT NOT NULL DEFAULT 'none',
        instructions TEXT,
        is_default INTEGER NOT NULL DEFAULT 1,
        archived_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name COLLATE NOCASE)
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        workout_type_id TEXT NOT NULL REFERENCES workout_types(id),
        name TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workout_sets (
        id TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id),
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        duration_seconds INTEGER,
        distance_meters REAL,
        custom_fields TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
      CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
      CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_single_active
        ON workouts(status) WHERE status = 'in_progress';
    `);
  },
  // v1 -> v2: Add rest_seconds to exercises
  async (db) => {
    await db.execAsync(`
      ALTER TABLE exercises ADD COLUMN rest_seconds INTEGER DEFAULT NULL;
    `);
  },
  // v2 -> v3: Add target rep range to workout_exercises
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workout_exercises ADD COLUMN target_reps_min INTEGER DEFAULT NULL;
      ALTER TABLE workout_exercises ADD COLUMN target_reps_max INTEGER DEFAULT NULL;
    `);
  },
  // v3 -> v4: Track time spent in workout screen
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workouts ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0;
    `);
  },
  // v4 -> v5: Track last session start for accurate elapsed time across continues
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workouts ADD COLUMN last_started_at TEXT;
      UPDATE workouts SET last_started_at = started_at;
    `);
  },
  // v5 -> v6: Add series_id to group repeated workouts into a series
  async (db) => {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN series_id TEXT;`);

    // Retroactively assign series_ids to existing repeated workouts.
    // Repeated workouts share a base name (strip trailing " (#N)") + workout_type_id.
    const rows = await db.getAllAsync<{ id: string; workout_type_id: string; name: string | null }>(
      `SELECT id, workout_type_id, name FROM workouts`
    );

    const stripSuffix = (name: string | null) => (name ?? '').replace(/\s*\(#\d+\)$/, '');
    const hasRepeatSuffix = (name: string | null) => /\(#\d+\)/.test(name ?? '');

    // Group by (workout_type_id, baseName)
    const groups = new Map<string, { id: string; name: string | null }[]>();
    for (const row of rows) {
      const key = `${row.workout_type_id}::${stripSuffix(row.name)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ id: row.id, name: row.name });
    }

    // Only assign a series_id when at least one member has the "(#N)" repeat suffix
    for (const members of Array.from(groups.values())) {
      if (!members.some((m: { id: string; name: string | null }) => hasRepeatSuffix(m.name))) continue;
      const seriesId = Crypto.randomUUID();
      for (const { id } of members) {
        await db.runAsync(`UPDATE workouts SET series_id = ? WHERE id = ?`, seriesId, id);
      }
    }
  },
  // v6 -> v7: Add superset groups to allow grouping exercises into supersets
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS superset_groups (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      ALTER TABLE workout_exercises ADD COLUMN superset_group_id TEXT REFERENCES superset_groups(id);
      ALTER TABLE workout_exercises ADD COLUMN superset_position INTEGER;

      CREATE INDEX IF NOT EXISTS idx_workout_exercises_superset ON workout_exercises(superset_group_id);
    `);
  },
  // v7 -> v8: Add workout_series table as single source of truth for workout names
  async (db) => {
    // Create the new workout_series table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_series (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_workouts_series_id ON workouts(series_id);
    `);

    // Step 1: Migrate workouts that already have a series_id
    // Insert one workout_series row per unique series_id, using the name from
    // the earliest workout in that series (fallback to workout_type name)
    const seriesGroups = await db.getAllAsync<{ series_id: string; name: string; created_at: string }>(
      `SELECT
         w.series_id,
         COALESCE(
           (SELECT w2.name FROM workouts w2
            WHERE w2.series_id = w.series_id AND w2.name IS NOT NULL
            ORDER BY w2.started_at ASC LIMIT 1),
           wt.name
         ) AS name,
         MIN(w.started_at) AS created_at
       FROM workouts w
       JOIN workout_types wt ON wt.id = w.workout_type_id
       WHERE w.series_id IS NOT NULL
       GROUP BY w.series_id`
    );

    for (const s of seriesGroups) {
      await db.runAsync(
        `INSERT OR IGNORE INTO workout_series (id, name, created_at) VALUES (?, ?, ?)`,
        s.series_id, s.name ?? 'Workout', s.created_at
      );
    }

    // Step 2: Migrate standalone workouts (no series_id) — create a series for each
    const standalone = await db.getAllAsync<{ id: string; name: string; started_at: string }>(
      `SELECT w.id, COALESCE(w.name, wt.name) AS name, w.started_at
       FROM workouts w
       JOIN workout_types wt ON wt.id = w.workout_type_id
       WHERE w.series_id IS NULL`
    );

    for (const w of standalone) {
      const seriesId = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO workout_series (id, name, created_at) VALUES (?, ?, ?)`,
        seriesId, w.name ?? 'Workout', w.started_at
      );
      await db.runAsync(
        `UPDATE workouts SET series_id = ? WHERE id = ?`,
        seriesId, w.id
      );
    }
  },
  // v8 -> v9: Add sort_order to workout_series for manual ordering
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workout_series ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    `);
    // Initialize: oldest series gets sort_order 1, newest gets N (sorted DESC = newest at top)
    await db.execAsync(`
      UPDATE workout_series
      SET sort_order = (
        SELECT COUNT(*) FROM workout_series ws2
        WHERE ws2.created_at < workout_series.created_at
          OR (ws2.created_at = workout_series.created_at AND ws2.id <= workout_series.id)
      );
    `);
  },
  // v9 -> v10: Add series_exercise_alternatives for per-series alternative exercises
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS series_exercise_alternatives (
        id TEXT PRIMARY KEY,
        series_id TEXT NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        alternative_exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(series_id, exercise_id, alternative_exercise_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sea_series_exercise ON series_exercise_alternatives(series_id, exercise_id);
    `);
  },
  // v10 -> v11: Replace series+exercise keyed alternatives with stable slot_id per exercise position
  async (db) => {
    // Add slot_id to workout_exercises; backfill existing rows with their own id
    await db.execAsync(`ALTER TABLE workout_exercises ADD COLUMN slot_id TEXT NOT NULL DEFAULT '';`);
    await db.execAsync(`UPDATE workout_exercises SET slot_id = id;`);
    // Drop old alternatives table (keyed by series+exercise, breaks after switching exercises)
    await db.execAsync(`DROP TABLE IF EXISTS series_exercise_alternatives;`);
    // New table keyed by stable slot_id
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_slot_alternatives (
        id TEXT PRIMARY KEY,
        slot_id TEXT NOT NULL,
        alternative_exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(slot_id, alternative_exercise_id)
      );
      CREATE INDEX IF NOT EXISTS idx_esa_slot ON exercise_slot_alternatives(slot_id);
    `);
  },
  // v11 -> v12: Add exercise_slots and exercise_options as first-class tables
  async (db) => {
    // Step 1: Create new tables and add exercise_option_id column
    await db.execAsync(`
      CREATE TABLE exercise_slots (
        id TEXT PRIMARY KEY,
        series_id TEXT NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_exercise_slots_series ON exercise_slots(series_id);

      CREATE TABLE exercise_options (
        id TEXT PRIMARY KEY,
        slot_id TEXT NOT NULL REFERENCES exercise_slots(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        is_primary INTEGER NOT NULL DEFAULT 0,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        target_reps_min INTEGER DEFAULT NULL,
        target_reps_max INTEGER DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(slot_id, exercise_id)
      );
      CREATE INDEX idx_exercise_options_slot ON exercise_options(slot_id);

      ALTER TABLE workout_exercises ADD COLUMN exercise_option_id TEXT
        REFERENCES exercise_options(id) ON DELETE SET NULL;
    `);

    // Step 2: Backfill exercise_slots (one per unique slot_id, inherit series from workout)
    await db.execAsync(`
      INSERT INTO exercise_slots (id, series_id, sort_order, created_at)
      SELECT we.slot_id, w.series_id, MIN(we.sort_order), MIN(we.created_at)
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.slot_id != '' AND w.series_id IS NOT NULL
      GROUP BY we.slot_id;
    `);

    // Step 3: Backfill exercise_options from workout_exercises (latest settings per slot+exercise)
    const uniquePairs = await db.getAllAsync<{ slot_id: string; exercise_id: string }>(
      `SELECT DISTINCT slot_id, exercise_id FROM workout_exercises
       WHERE slot_id != '' AND EXISTS (SELECT 1 FROM exercise_slots WHERE id = slot_id)`
    );
    for (const pair of uniquePairs) {
      const latest = await db.getFirstAsync<{
        rest_seconds: number;
        target_reps_min: number | null;
        target_reps_max: number | null;
        created_at: string;
      }>(
        `SELECT we.rest_seconds, we.target_reps_min, we.target_reps_max, we.created_at
         FROM workout_exercises we
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.slot_id = ? AND we.exercise_id = ?
         ORDER BY w.started_at DESC LIMIT 1`,
        pair.slot_id, pair.exercise_id
      );
      if (latest) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercise_options
             (id, slot_id, exercise_id, is_primary, rest_seconds, target_reps_min, target_reps_max, created_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
          Crypto.randomUUID(), pair.slot_id, pair.exercise_id,
          latest.rest_seconds, latest.target_reps_min, latest.target_reps_max, latest.created_at
        );
      }
    }

    // Step 4: Backfill exercise_options from exercise_slot_alternatives (as non-primary)
    const alternatives = await db.getAllAsync<{
      slot_id: string;
      alternative_exercise_id: string;
      created_at: string;
    }>(
      `SELECT esa.slot_id, esa.alternative_exercise_id, esa.created_at
       FROM exercise_slot_alternatives esa
       WHERE EXISTS (SELECT 1 FROM exercise_slots WHERE id = esa.slot_id)`
    );
    for (const alt of alternatives) {
      const primaryRest = await db.getFirstAsync<{ rest_seconds: number }>(
        `SELECT rest_seconds FROM exercise_options WHERE slot_id = ? AND is_primary = 1 LIMIT 1`,
        alt.slot_id
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO exercise_options
           (id, slot_id, exercise_id, is_primary, rest_seconds, created_at)
         VALUES (?, ?, ?, 0, ?, ?)`,
        Crypto.randomUUID(), alt.slot_id, alt.alternative_exercise_id,
        primaryRest?.rest_seconds ?? 90, alt.created_at
      );
    }

    // Step 5: Populate exercise_option_id on existing workout_exercises
    await db.execAsync(`
      UPDATE workout_exercises SET exercise_option_id = (
        SELECT eo.id FROM exercise_options eo
        WHERE eo.slot_id = workout_exercises.slot_id
          AND eo.exercise_id = workout_exercises.exercise_id
        LIMIT 1
      );
    `);
  },
  // v12 → v13: Replace 'shoulders' muscle group with granular delt sub-groups (front_delt, side_delt, rear_delt)
  async (db) => {
    await db.execAsync(`
      UPDATE exercises
      SET primary_muscles = REPLACE(primary_muscles, '"shoulders"', '"front_delt"')
      WHERE primary_muscles LIKE '%"shoulders"%';
    `);
  },
  // v13 → v14: Add body_weight_entries table for weight tracking
  async (db) => {
    await db.execAsync(`
      CREATE TABLE body_weight_entries (
        id TEXT PRIMARY KEY NOT NULL,
        weight_kg REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX idx_body_weight_date ON body_weight_entries(date);
    `);
  },
  // v14 → v15: Add scheduled_workouts table for future workout planning
  async (db) => {
    await db.execAsync(`
      CREATE TABLE scheduled_workouts (
        id TEXT PRIMARY KEY NOT NULL,
        series_id TEXT NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
        scheduled_date TEXT NOT NULL,
        notes TEXT,
        started_workout_id TEXT REFERENCES workouts(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_scheduled_workouts_date ON scheduled_workouts(scheduled_date);
      CREATE INDEX idx_scheduled_workouts_series ON scheduled_workouts(series_id);
    `);
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;
  const targetVersion = APP_CONFIG.database.schemaVersion;

  if (currentVersion >= targetVersion) return;

  for (let i = currentVersion; i < targetVersion; i++) {
    const migration = migrations[i];
    if (!migration) {
      throw new Error(`Missing migration for version ${i} -> ${i + 1}`);
    }
    await db.withTransactionAsync(async () => {
      await migration(db);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
