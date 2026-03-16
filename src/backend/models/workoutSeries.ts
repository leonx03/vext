/** WorkoutSeries model - manages the workout_series table (create, lookup, rename). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { WorkoutSeries } from '@shared/types/workout';

interface WorkoutSeriesRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

function mapRow(row: WorkoutSeriesRow): WorkoutSeries {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  name: string
): Promise<WorkoutSeries> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workout_series (id, name, sort_order, created_at)
     VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM workout_series), datetime('now'))`,
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

export async function moveUp(
  db: SQLite.SQLiteDatabase,
  seriesId: string
): Promise<void> {
  // Sorted DESC = highest sort_order at top. moveUp = swap with neighbor that has higher sort_order
  const all = await db.getAllAsync<{ id: string; sort_order: number }>(
    `SELECT id, sort_order FROM workout_series ORDER BY sort_order DESC`
  );
  const idx = all.findIndex((s) => s.id === seriesId);
  if (idx <= 0) return;
  const current = all[idx];
  const above = all[idx - 1];
  await db.runAsync(`UPDATE workout_series SET sort_order = ? WHERE id = ?`, above.sort_order, current.id);
  await db.runAsync(`UPDATE workout_series SET sort_order = ? WHERE id = ?`, current.sort_order, above.id);
}

export async function moveDown(
  db: SQLite.SQLiteDatabase,
  seriesId: string
): Promise<void> {
  const all = await db.getAllAsync<{ id: string; sort_order: number }>(
    `SELECT id, sort_order FROM workout_series ORDER BY sort_order DESC`
  );
  const idx = all.findIndex((s) => s.id === seriesId);
  if (idx < 0 || idx >= all.length - 1) return;
  const current = all[idx];
  const below = all[idx + 1];
  await db.runAsync(`UPDATE workout_series SET sort_order = ? WHERE id = ?`, below.sort_order, current.id);
  await db.runAsync(`UPDATE workout_series SET sort_order = ? WHERE id = ?`, current.sort_order, below.id);
}
