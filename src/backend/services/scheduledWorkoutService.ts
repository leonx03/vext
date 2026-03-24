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
  seriesId: string
): Promise<Workout> {
  // Find the latest completed workout in this series to repeat
  const latest = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM workouts WHERE series_id = ? AND status = 'completed' ORDER BY started_at DESC LIMIT 1`,
    seriesId
  );
  if (!latest) {
    throw new Error('No completed workout found in this series to repeat');
  }
  const workout = await workoutService.repeatWorkout(db, latest.id);
  await scheduledWorkoutModel.markStarted(db, scheduledId, workout.id);
  return workout;
}
