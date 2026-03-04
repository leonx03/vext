/** WorkoutSet model - manages individual sets within a workout exercise (add, update, remove). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { WorkoutSet } from '@shared/types/workout';

interface WorkoutSetRow {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  custom_fields: string | null;
  completed_at: string | null;
  created_at: string;
}

function mapRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: row.weight_kg,
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
    customFields: row.custom_fields
      ? (JSON.parse(row.custom_fields) as Record<string, unknown>)
      : null,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export interface WorkoutSetInput {
  reps?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  customFields?: Record<string, unknown> | null;
}

export async function add(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string,
  data: WorkoutSetInput = {}
): Promise<WorkoutSet> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workout_sets (
       id, workout_exercise_id, set_number,
       reps, weight_kg, duration_seconds, distance_meters,
       custom_fields, completed_at, created_at
     ) VALUES (
       ?, ?,
       COALESCE((SELECT MAX(set_number) + 1 FROM workout_sets WHERE workout_exercise_id = ?), 1),
       ?, ?, ?, ?,
       ?, datetime('now'), datetime('now')
     )`,
    id,
    workoutExerciseId,
    workoutExerciseId,
    data.reps ?? null,
    data.weightKg ?? null,
    data.durationSeconds ?? null,
    data.distanceMeters ?? null,
    data.customFields ? JSON.stringify(data.customFields) : null
  );
  const row = await db.getFirstAsync<WorkoutSetRow>(
    `SELECT * FROM workout_sets WHERE id = ?`,
    id
  );
  if (!row) throw new Error(`Failed to create workout set with id ${id}`);
  return mapRow(row);
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: WorkoutSetInput
): Promise<WorkoutSet> {
  await db.runAsync(
    `UPDATE workout_sets SET
       reps = ?,
       weight_kg = ?,
       duration_seconds = ?,
       distance_meters = ?,
       custom_fields = ?
     WHERE id = ?`,
    data.reps ?? null,
    data.weightKg ?? null,
    data.durationSeconds ?? null,
    data.distanceMeters ?? null,
    data.customFields ? JSON.stringify(data.customFields) : null,
    id
  );
  const row = await db.getFirstAsync<WorkoutSetRow>(
    `SELECT * FROM workout_sets WHERE id = ?`,
    id
  );
  if (!row) throw new Error(`Workout set not found after update, id ${id}`);
  return mapRow(row);
}

export async function remove(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const target = await db.getFirstAsync<{
      workout_exercise_id: string;
      set_number: number;
    }>(
      `SELECT workout_exercise_id, set_number FROM workout_sets WHERE id = ?`,
      id
    );
    if (!target) return;

    await db.runAsync(`DELETE FROM workout_sets WHERE id = ?`, id);

    // Renumber remaining sets to close the gap
    await db.runAsync(
      `UPDATE workout_sets
       SET set_number = set_number - 1
       WHERE workout_exercise_id = ? AND set_number > ?`,
      target.workout_exercise_id,
      target.set_number
    );
  });
}

export async function getByWorkoutExercise(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number`,
    workoutExerciseId
  );
  return rows.map(mapRow);
}

export async function getByWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT ws.*
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.sort_order, ws.set_number`,
    workoutId
  );
  return rows.map(mapRow);
}

/**
 * Returns all sets from the most recent completed workout containing the given exercise.
 * If workoutTypeId is provided, restricts to workouts of that type.
 * Used to show "Last time" reference data on ExerciseCard.
 */
export async function getLatestSetsForExercise(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  workoutTypeId?: string
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<WorkoutSetRow>(
    `SELECT ws.*
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ?
       AND w.status = 'completed'
       ${workoutTypeId ? "AND w.workout_type_id = ?" : ""}
     ORDER BY w.completed_at DESC, ws.set_number ASC`,
    ...(workoutTypeId ? [exerciseId, workoutTypeId] : [exerciseId])
  );
  if (rows.length === 0) return [];
  // All rows are ordered by completed_at DESC — take only sets from the most recent workout
  const firstWorkoutExerciseId = rows[0].workout_exercise_id;
  return rows
    .filter((r) => r.workout_exercise_id === firstWorkoutExerciseId)
    .map(mapRow);
}

/**
 * Batch version: returns previous sets for multiple exercises at once.
 * If workoutTypeId is provided, restricts to workouts of that type.
 * Returns a Map keyed by exerciseId.
 */
export async function getLatestSetsForExercises(
  db: SQLite.SQLiteDatabase,
  exerciseIds: string[],
  workoutTypeId?: string
): Promise<Map<string, WorkoutSet[]>> {
  const result = new Map<string, WorkoutSet[]>();
  if (exerciseIds.length === 0) return result;

  // Fetch in parallel
  await Promise.all(
    exerciseIds.map(async (eid) => {
      const sets = await getLatestSetsForExercise(db, eid, workoutTypeId);
      if (sets.length > 0) result.set(eid, sets);
    })
  );
  return result;
}
