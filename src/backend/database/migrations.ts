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
