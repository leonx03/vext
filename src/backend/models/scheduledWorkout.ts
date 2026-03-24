/** Scheduled workout model - CRUD operations for the scheduled_workouts table. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { ScheduledWorkout } from '@shared/types/scheduledWorkout';

interface ScheduledWorkoutRow {
  id: string;
  series_id: string;
  series_name: string;
  scheduled_date: string;
  notes: string | null;
  started_workout_id: string | null;
  workout_status: string | null;
  created_at: string;
}

function mapRow(row: ScheduledWorkoutRow): ScheduledWorkout {
  return {
    id: row.id,
    seriesId: row.series_id,
    seriesName: row.series_name,
    scheduledDate: row.scheduled_date,
    notes: row.notes,
    startedWorkoutId: row.started_workout_id,
    workoutStatus: row.workout_status,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_JOIN = `
  SELECT sw.*, ws.name AS series_name, w.status AS workout_status
  FROM scheduled_workouts sw
  JOIN workout_series ws ON ws.id = sw.series_id
  LEFT JOIN workouts w ON w.id = sw.started_workout_id
`;

export async function create(
  db: SQLite.SQLiteDatabase,
  seriesId: string,
  scheduledDate: string,
  notes?: string | null
): Promise<ScheduledWorkout> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO scheduled_workouts (id, series_id, scheduled_date, notes)
     VALUES (?, ?, ?, ?)`,
    id, seriesId, scheduledDate, notes ?? null
  );
  const row = await db.getFirstAsync<ScheduledWorkoutRow>(
    `${SELECT_WITH_JOIN} WHERE sw.id = ?`,
    id
  );
  return mapRow(row!);
}

export async function getByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<ScheduledWorkout[]> {
  const rows = await db.getAllAsync<ScheduledWorkoutRow>(
    `${SELECT_WITH_JOIN} WHERE sw.scheduled_date >= ? AND sw.scheduled_date <= ? ORDER BY sw.scheduled_date`,
    startDate, endDate
  );
  return rows.map(mapRow);
}

export async function getByDate(
  db: SQLite.SQLiteDatabase,
  date: string
): Promise<ScheduledWorkout[]> {
  const rows = await db.getAllAsync<ScheduledWorkoutRow>(
    `${SELECT_WITH_JOIN} WHERE sw.scheduled_date = ?`,
    date
  );
  return rows.map(mapRow);
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: { scheduledDate?: string; notes?: string | null }
): Promise<void> {
  if (data.scheduledDate !== undefined) {
    await db.runAsync('UPDATE scheduled_workouts SET scheduled_date = ? WHERE id = ?', data.scheduledDate, id);
  }
  if (data.notes !== undefined) {
    await db.runAsync('UPDATE scheduled_workouts SET notes = ? WHERE id = ?', data.notes, id);
  }
}

export async function remove(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM scheduled_workouts WHERE id = ?', id);
}

export async function markStarted(
  db: SQLite.SQLiteDatabase,
  id: string,
  workoutId: string
): Promise<void> {
  await db.runAsync(
    'UPDATE scheduled_workouts SET started_workout_id = ? WHERE id = ?',
    workoutId, id
  );
}
