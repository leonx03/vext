/** ExerciseSlot model - manages exercise slot positions within a workout series. */
import type * as SQLite from 'expo-sqlite';
import type { ExerciseSlot } from '@shared/types/workout';

interface ExerciseSlotRow {
  id: string;
  series_id: string;
  sort_order: number;
  created_at: string;
}

function mapRow(row: ExerciseSlotRow): ExerciseSlot {
  return {
    id: row.id,
    seriesId: row.series_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  id: string,
  seriesId: string,
  sortOrder = 0
): Promise<ExerciseSlot> {
  await db.runAsync(
    `INSERT INTO exercise_slots (id, series_id, sort_order) VALUES (?, ?, ?)`,
    id, seriesId, sortOrder
  );
  const row = await db.getFirstAsync<ExerciseSlotRow>(
    `SELECT * FROM exercise_slots WHERE id = ?`, id
  );
  if (!row) throw new Error(`Failed to create exercise slot, id ${id}`);
  return mapRow(row);
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<ExerciseSlot | null> {
  const row = await db.getFirstAsync<ExerciseSlotRow>(
    `SELECT * FROM exercise_slots WHERE id = ?`, id
  );
  return row ? mapRow(row) : null;
}

export async function getBySeries(
  db: SQLite.SQLiteDatabase,
  seriesId: string
): Promise<ExerciseSlot[]> {
  const rows = await db.getAllAsync<ExerciseSlotRow>(
    `SELECT * FROM exercise_slots WHERE series_id = ? ORDER BY sort_order`, seriesId
  );
  return rows.map(mapRow);
}

export async function ensureExists(
  db: SQLite.SQLiteDatabase,
  slotId: string,
  seriesId: string
): Promise<ExerciseSlot> {
  const existing = await getById(db, slotId);
  if (existing) return existing;
  return create(db, slotId, seriesId);
}
