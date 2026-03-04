/** Database migrations - schema versioning via PRAGMA user_version with sequential upgrades. */
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
