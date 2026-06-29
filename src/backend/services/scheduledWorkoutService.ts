/** Scheduled workout service - business logic for scheduling and managing future workouts. */
import type * as SQLite from 'expo-sqlite';
import * as scheduledWorkoutModel from '@backend/models/scheduledWorkout';
import * as workoutService from '@backend/services/workoutService';
import type { ScheduledWorkout } from '@shared/types/scheduledWorkout';
import type { Workout } from '@shared/types/workout';

export async function scheduleWorkout(
  db: SQLite.SQLiteDatabase,
  seriesId: string,
  date: string,
  notes?: string | null
): Promise<ScheduledWorkout> {
  return scheduledWorkoutModel.create(db, seriesId, date, notes);
}

export async function getScheduledByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<ScheduledWorkout[]> {
  return scheduledWorkoutModel.getByDateRange(db, startDate, endDate);
}

export async function getScheduledByDate(
  db: SQLite.SQLiteDatabase,
  date: string
): Promise<ScheduledWorkout[]> {
  return scheduledWorkoutModel.getByDate(db, date);
}

export async function reschedule(
  db: SQLite.SQLiteDatabase,
  id: string,
  newDate: string
): Promise<void> {
  return scheduledWorkoutModel.update(db, id, { scheduledDate: newDate });
}

export async function cancelScheduled(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  return scheduledWorkoutModel.remove(db, id);
}

export async function startScheduledWorkout(
  db: SQLite.SQLiteDatabase,
  scheduledId: string,
  seriesId: string,
  gymId?: string | null
): Promise<Workout> {
  // Prefer cloning the latest completed session (carries per-gym weight progression).
  const latest = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM workouts WHERE series_id = ? AND status = 'completed' ORDER BY started_at DESC LIMIT 1`,
    seriesId
  );
  // No history yet (e.g. a seeded/templated series) — instantiate from the series template.
  const workout = latest
    ? await workoutService.repeatWorkout(db, latest.id, gymId)
    : await workoutService.startWorkoutFromSeriesTemplate(db, seriesId, gymId);
  await scheduledWorkoutModel.markStarted(db, scheduledId, workout.id);
  return workout;
}
