/** ExerciseOption model - manages exercise options (primary + alternatives) within a slot. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { ExerciseOption } from '@shared/types/workout';

interface ExerciseOptionRow {
  id: string;
  slot_id: string;
  exercise_id: string;
  is_primary: number;
  rest_seconds: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  created_at: string;
}

function mapRow(row: ExerciseOptionRow): ExerciseOption {
  return {
    id: row.id,
    slotId: row.slot_id,
    exerciseId: row.exercise_id,
    isPrimary: row.is_primary === 1,
    restSeconds: row.rest_seconds,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  slotId: string,
  exerciseId: string,
  isPrimary: boolean,
  restSeconds: number,
  targetRepsMin?: number | null,
  targetRepsMax?: number | null
): Promise<ExerciseOption> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO exercise_options (id, slot_id, exercise_id, is_primary, rest_seconds, target_reps_min, target_reps_max)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id, slotId, exerciseId, isPrimary ? 1 : 0, restSeconds,
    targetRepsMin ?? null, targetRepsMax ?? null
  );
  const row = await db.getFirstAsync<ExerciseOptionRow>(
    `SELECT * FROM exercise_options WHERE id = ?`, id
  );
  if (!row) throw new Error(`Failed to create exercise option, id ${id}`);
  return mapRow(row);
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<ExerciseOption | null> {
  const row = await db.getFirstAsync<ExerciseOptionRow>(
    `SELECT * FROM exercise_options WHERE id = ?`, id
  );
  return row ? mapRow(row) : null;
}

export async function getBySlot(
  db: SQLite.SQLiteDatabase,
  slotId: string
): Promise<ExerciseOption[]> {
  const rows = await db.getAllAsync<ExerciseOptionRow>(
    `SELECT * FROM exercise_options WHERE slot_id = ? ORDER BY is_primary DESC`, slotId
  );
  return rows.map(mapRow);
}

export async function getBySlotAndExercise(
  db: SQLite.SQLiteDatabase,
  slotId: string,
  exerciseId: string
): Promise<ExerciseOption | null> {
  const row = await db.getFirstAsync<ExerciseOptionRow>(
    `SELECT * FROM exercise_options WHERE slot_id = ? AND exercise_id = ?`,
    slotId, exerciseId
  );
  return row ? mapRow(row) : null;
}

export async function ensureExists(
  db: SQLite.SQLiteDatabase,
  slotId: string,
  exerciseId: string,
  isPrimary: boolean,
  restSeconds: number,
  targetRepsMin?: number | null,
  targetRepsMax?: number | null
): Promise<ExerciseOption> {
  const existing = await getBySlotAndExercise(db, slotId, exerciseId);
  if (existing) return existing;
  return create(db, slotId, exerciseId, isPrimary, restSeconds, targetRepsMin, targetRepsMax);
}

export async function updateRestSeconds(
  db: SQLite.SQLiteDatabase,
  id: string,
  restSeconds: number
): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_options SET rest_seconds = ? WHERE id = ?`, restSeconds, id
  );
}

export async function updateTargetReps(
  db: SQLite.SQLiteDatabase,
  id: string,
  targetRepsMin: number | null,
  targetRepsMax: number | null
): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_options SET target_reps_min = ?, target_reps_max = ? WHERE id = ?`,
    targetRepsMin, targetRepsMax, id
  );
}
