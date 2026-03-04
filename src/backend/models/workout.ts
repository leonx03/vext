/** Workout model - CRUD operations for the workouts table (create, complete, discard, reopen). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Workout, WorkoutStatus } from '@shared/types/workout';

interface WorkoutRow {
  id: string;
  workout_type_id: string;
  name: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  elapsed_seconds: number;
  last_started_at: string | null;
}

function mapRow(row: WorkoutRow): Workout {
  return {
    id: row.id,
    workoutTypeId: row.workout_type_id,
    name: row.name,
    status: row.status as WorkoutStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    elapsedSeconds: row.elapsed_seconds,
    lastStartedAt: row.last_started_at,
  };
}

export async function updateElapsedSeconds(
  db: SQLite.SQLiteDatabase,
  id: string,
  seconds: number
): Promise<void> {
  await db.runAsync(
    `UPDATE workouts SET elapsed_seconds = ? WHERE id = ?`,
    seconds,
    id
  );
}

export async function create(
  db: SQLite.SQLiteDatabase,
  workoutTypeId: string,
  name?: string | null
): Promise<Workout> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workouts (id, workout_type_id, name, status, started_at, last_started_at, created_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
    id,
    workoutTypeId,
    name ?? null,
    WorkoutStatus.InProgress
  );
  const workout = await getById(db, id);
  if (!workout) throw new Error(`Failed to create workout with id ${id}`);
  return workout;
}

export async function getActive(
  db: SQLite.SQLiteDatabase
): Promise<Workout | null> {
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE status = ? LIMIT 1`,
    WorkoutStatus.InProgress
  );
  return row ? mapRow(row) : null;
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<Workout | null> {
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE id = ?`,
    id
  );
  return row ? mapRow(row) : null;
}

export async function complete(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE workouts
     SET status = ?,
         completed_at = datetime('now'),
         elapsed_seconds = elapsed_seconds + MAX(0, CAST((julianday('now') - julianday(COALESCE(last_started_at, started_at))) * 86400 AS INTEGER))
     WHERE id = ?`,
    WorkoutStatus.Completed,
    id
  );
}

export async function reopen(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE workouts SET status = ?, completed_at = NULL, last_started_at = datetime('now') WHERE id = ?`,
    WorkoutStatus.InProgress,
    id
  );
}

export async function discard(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE workouts SET status = ? WHERE id = ?`,
    WorkoutStatus.Discarded,
    id
  );
}

export async function remove(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Delete sets -> exercises -> workout (respecting FK order)
    await db.runAsync(
      `DELETE FROM workout_sets WHERE workout_exercise_id IN
         (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      id
    );
    await db.runAsync(`DELETE FROM workout_exercises WHERE workout_id = ?`, id);
    await db.runAsync(`DELETE FROM workouts WHERE id = ?`, id);
  });
}

export async function getCompleted(
  db: SQLite.SQLiteDatabase,
  limit: number,
  offset: number
): Promise<Workout[]> {
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE status = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    WorkoutStatus.Completed,
    limit,
    offset
  );
  return rows.map(mapRow);
}

export async function getCompletedCount(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workouts WHERE status = ?`,
    WorkoutStatus.Completed
  );
  return row?.count ?? 0;
}

export async function getCompletedByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<Workout[]> {
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workouts
     WHERE status = ? AND started_at >= ? AND started_at <= ?
     ORDER BY started_at DESC`,
    WorkoutStatus.Completed,
    startDate,
    endDate
  );
  return rows.map(mapRow);
}
