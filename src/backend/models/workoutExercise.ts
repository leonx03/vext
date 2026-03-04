/** WorkoutExercise model - manages exercises within a workout (add, remove, reorder, update settings). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  WorkoutExercise,
  WorkoutExerciseFull,
} from '@shared/types/workout';

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  sort_order: number;
  rest_seconds: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  notes: string | null;
  created_at: string;
  superset_group_id: string | null;
  superset_position: number | null;
}

interface WorkoutExerciseFullRow extends WorkoutExerciseRow {
  exercise_name: string;
  exercise_category: string;
}

function mapRow(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    sortOrder: row.sort_order,
    restSeconds: row.rest_seconds,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    notes: row.notes,
    createdAt: row.created_at,
    supersetGroupId: row.superset_group_id,
    supersetPosition: row.superset_position,
  };
}

function mapFullRow(row: WorkoutExerciseFullRow): WorkoutExerciseFull {
  return {
    ...mapRow(row),
    exerciseName: row.exercise_name,
    exerciseCategory: row.exercise_category,
    sets: [],
  };
}

export async function addToWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  exerciseId: string,
  restSeconds: number,
  targetRepsMin?: number | null,
  targetRepsMax?: number | null
): Promise<WorkoutExercise> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, rest_seconds, target_reps_min, target_reps_max, created_at)
     VALUES (
       ?, ?, ?,
       COALESCE((SELECT MAX(sort_order) + 1 FROM workout_exercises WHERE workout_id = ?), 0),
       ?, ?, ?,
       datetime('now')
     )`,
    id,
    workoutId,
    exerciseId,
    workoutId,
    restSeconds,
    targetRepsMin ?? null,
    targetRepsMax ?? null
  );
  const row = await db.getFirstAsync<WorkoutExerciseRow>(
    `SELECT * FROM workout_exercises WHERE id = ?`,
    id
  );
  if (!row) throw new Error(`Failed to add exercise to workout, id ${id}`);
  return mapRow(row);
}

export async function getByWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<WorkoutExerciseFull[]> {
  const rows = await db.getAllAsync<WorkoutExerciseFullRow>(
    `SELECT
       we.*,
       e.name  AS exercise_name,
       e.category AS exercise_category
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.sort_order`,
    workoutId
  );
  return rows.map(mapFullRow);
}

export async function removeFromWorkout(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM workout_sets WHERE workout_exercise_id = ?`,
      id
    );
    await db.runAsync(
      `DELETE FROM workout_exercises WHERE id = ?`,
      id
    );
  });
}

export async function updateRestSeconds(
  db: SQLite.SQLiteDatabase,
  id: string,
  restSeconds: number
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_exercises SET rest_seconds = ? WHERE id = ?`,
    restSeconds,
    id
  );
}

export async function updateTargetReps(
  db: SQLite.SQLiteDatabase,
  id: string,
  targetRepsMin: number | null,
  targetRepsMax: number | null
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_exercises SET target_reps_min = ?, target_reps_max = ? WHERE id = ?`,
    targetRepsMin,
    targetRepsMax,
    id
  );
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<WorkoutExercise | null> {
  const row = await db.getFirstAsync<WorkoutExerciseRow>(
    `SELECT * FROM workout_exercises WHERE id = ?`,
    id
  );
  return row ? mapRow(row) : null;
}

export async function assignToSuperset(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string,
  groupId: string,
  position: number
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_exercises SET superset_group_id = ?, superset_position = ? WHERE id = ?`,
    groupId,
    position,
    workoutExerciseId
  );
}

export async function removeFromSuperset(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_exercises SET superset_group_id = NULL, superset_position = NULL WHERE id = ?`,
    workoutExerciseId
  );
}

export async function getBySuperset(
  db: SQLite.SQLiteDatabase,
  groupId: string
): Promise<WorkoutExerciseFull[]> {
  const rows = await db.getAllAsync<WorkoutExerciseFullRow>(
    `SELECT
       we.*,
       e.name AS exercise_name,
       e.category AS exercise_category
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.superset_group_id = ?
     ORDER BY we.superset_position`,
    groupId
  );
  return rows.map(mapFullRow);
}

export async function reorder(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  orderedIds: string[]
): Promise<void> {
  if (orderedIds.length === 0) return;
  const whenClauses = orderedIds.map(() => `WHEN ? THEN ?`).join(' ');
  const inPlaceholders = orderedIds.map(() => '?').join(', ');
  const whenParams = orderedIds.flatMap((id, i) => [id, i]);
  await db.runAsync(
    `UPDATE workout_exercises SET sort_order = CASE id ${whenClauses} END WHERE workout_id = ? AND id IN (${inPlaceholders})`,
    ...whenParams,
    workoutId,
    ...orderedIds
  );
}
