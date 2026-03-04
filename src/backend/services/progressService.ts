/** Progress service - computes stats, streaks, personal records, and volume trends. */
import type * as SQLite from 'expo-sqlite';

export interface PersonalRecords {
  maxWeight: number | null;
  maxReps: number | null;
  estimated1RM: number | null;
}

export interface VolumeDataPoint {
  week: string;
  volume: number;
}

export interface FrequencyDataPoint {
  week: string;
  count: number;
}

export interface TodayStats {
  workoutsToday: number;
  volumeToday: number;
}

export async function getPersonalRecords(
  db: SQLite.SQLiteDatabase,
  exerciseId: string
): Promise<PersonalRecords> {
  const row = await db.getFirstAsync<{
    max_weight: number | null;
    max_reps: number | null;
  }>(
    `SELECT
       MAX(ws.weight_kg) AS max_weight,
       MAX(ws.reps)      AS max_reps
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ?
       AND w.status = 'completed'`,
    exerciseId
  );

  const maxWeight = row?.max_weight ?? null;
  const maxReps = row?.max_reps ?? null;

  // Calculate estimated 1RM using Epley formula (weight * (1 + reps/30))
  // Find the set that yields the highest 1RM among completed workouts
  const oneRMRow = await db.getFirstAsync<{ estimated_1rm: number | null }>(
    `SELECT
       MAX(ws.weight_kg * (1.0 + ws.reps / 30.0)) AS estimated_1rm
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ?
       AND w.status = 'completed'
       AND ws.weight_kg IS NOT NULL
       AND ws.reps IS NOT NULL`,
    exerciseId
  );

  const estimated1RM = oneRMRow?.estimated_1rm ?? null;

  return { maxWeight, maxReps, estimated1RM };
}

export async function getVolumeOverTime(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  weeks: number
): Promise<VolumeDataPoint[]> {
  const rows = await db.getAllAsync<{ week: string; volume: number }>(
    `SELECT
       strftime('%Y-W%W', w.completed_at) AS week,
       SUM(ws.weight_kg * ws.reps)        AS volume
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ?
       AND w.status = 'completed'
       AND w.completed_at >= date('now', ? || ' days')
       AND ws.weight_kg IS NOT NULL
       AND ws.reps IS NOT NULL
     GROUP BY week
     ORDER BY week`,
    exerciseId,
    `-${weeks * 7}`
  );
  return rows;
}

export async function getWorkoutFrequency(
  db: SQLite.SQLiteDatabase,
  weeks: number
): Promise<FrequencyDataPoint[]> {
  const rows = await db.getAllAsync<{ week: string; count: number }>(
    `SELECT
       strftime('%Y-W%W', started_at) AS week,
       COUNT(*)                        AS count
     FROM workouts
     WHERE status = 'completed'
       AND started_at >= date('now', ? || ' days')
     GROUP BY week
     ORDER BY week`,
    `-${weeks * 7}`
  );
  return rows;
}

export async function getCurrentStreak(db: SQLite.SQLiteDatabase): Promise<number> {
  // Fetch all distinct days with at least one completed workout, most recent first
  const rows = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(started_at) AS day
     FROM workouts
     WHERE status = 'completed'
     ORDER BY day DESC`
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  // Use UTC date string to match SQLite's date('now') which is always UTC
  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    const expected = new Date(today + 'T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() - streak);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (row.day === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface WeeklyStats {
  workoutsThisWeek: number;
  setsThisWeek: number;
  volumeThisWeek: number;
}

export async function getWeeklyStats(
  db: SQLite.SQLiteDatabase,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyStats> {
  const row = await db.getFirstAsync<{ workout_count: number; set_count: number; total_volume: number | null }>(
    `SELECT
       COUNT(DISTINCT w.id)                           AS workout_count,
       COUNT(ws.id)                                   AS set_count,
       COALESCE(SUM(ws.weight_kg * ws.reps), 0)       AS total_volume
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE w.status = 'completed'
       AND date(w.started_at) BETWEEN ? AND ?`,
    weekStart,
    weekEnd
  );

  return {
    workoutsThisWeek: row?.workout_count ?? 0,
    setsThisWeek: row?.set_count ?? 0,
    volumeThisWeek: row?.total_volume ?? 0,
  };
}

export async function getWeeklySetsByMuscleGroup(
  db: SQLite.SQLiteDatabase,
  weekStart: string,
  weekEnd: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ muscle_group: string; set_count: number }>(
    `SELECT jm.value AS muscle_group, COUNT(ws.id) AS set_count
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     JOIN exercises e ON e.id = we.exercise_id
     JOIN json_each(e.primary_muscles) jm
     WHERE w.status = 'completed'
       AND date(w.started_at) BETWEEN ? AND ?
     GROUP BY jm.value
     ORDER BY set_count DESC`,
    weekStart,
    weekEnd
  );
  const result: Record<string, number> = {};
  for (const row of rows) result[row.muscle_group] = row.set_count;
  return result;
}

export async function getWeeklyPRCount(
  db: SQLite.SQLiteDatabase,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  const row = await db.getFirstAsync<{ pr_count: number }>(
    `WITH period_max AS (
       SELECT we.exercise_id, MAX(ws.weight_kg) AS max_weight
       FROM workout_sets ws
       JOIN workout_exercises we ON we.id = ws.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.status = 'completed'
         AND date(w.started_at) BETWEEN ? AND ?
         AND ws.weight_kg IS NOT NULL
       GROUP BY we.exercise_id
     )
     SELECT COUNT(*) AS pr_count
     FROM period_max pm
     WHERE pm.max_weight > COALESCE(
       (SELECT MAX(ws2.weight_kg)
        FROM workout_sets ws2
        JOIN workout_exercises we2 ON we2.id = ws2.workout_exercise_id
        JOIN workouts w2 ON w2.id = we2.workout_id
        WHERE we2.exercise_id = pm.exercise_id
          AND w2.status = 'completed'
          AND date(w2.started_at) < ?
          AND ws2.weight_kg IS NOT NULL),
       0
     )`,
    weekStart,
    weekEnd,
    weekStart
  );
  return row?.pr_count ?? 0;
}

export async function getTodayStats(db: SQLite.SQLiteDatabase): Promise<TodayStats> {
  const workoutsRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM workouts
     WHERE status = 'completed'
       AND date(started_at) = date('now')`
  );

  const volumeRow = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(ws.weight_kg * ws.reps) AS total
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.status = 'completed'
       AND date(w.started_at) = date('now')
       AND ws.weight_kg IS NOT NULL
       AND ws.reps IS NOT NULL`
  );

  return {
    workoutsToday: workoutsRow?.count ?? 0,
    volumeToday: volumeRow?.total ?? 0,
  };
}
