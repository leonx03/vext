/** WorkoutSeries model - manages the workout_series table (create, lookup, rename). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { WorkoutSeries } from '@shared/types/workout';

interface WorkoutSeriesRow {
  id: string;
  name: string;
  created_at: string;
}

function mapRow(row: WorkoutSeriesRow): WorkoutSeries {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  name: string
): Promise<WorkoutSeries> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workout_series (id, name, created_at) VALUES (?, ?, datetime('now'))`,
    id,
    name
  );
  const row = await db.getFirstAsync<WorkoutSeriesRow>(
    `SELECT * FROM workout_series WHERE id = ?`,
    id
  );
  if (!row) throw new Error(`Failed to create workout series with id ${id}`);
  return mapRow(row);
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<WorkoutSeries | null> {
  const row = await db.getFirstAsync<WorkoutSeriesRow>(
    `SELECT * FROM workout_series WHERE id = ?`,
    id
  );
  return row ? mapRow(row) : null;
}

export async function updateName(
  db: SQLite.SQLiteDatabase,
  id: string,
  name: string
): Promise<void> {
  await db.runAsync(`UPDATE workout_series SET name = ? WHERE id = ?`, name, id);
}
