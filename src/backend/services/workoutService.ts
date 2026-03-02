/** Workout service - orchestrates workout lifecycle, set logging, and exercise management. */
import type * as SQLite from 'expo-sqlite';
import * as workout from '@backend/models/workout';
import * as workoutExercise from '@backend/models/workoutExercise';
import * as workoutSet from '@backend/models/workoutSet';
import * as workoutType from '@backend/models/workoutType';
import * as exercise from '@backend/models/exercise';
import { getDefaultRestSeconds } from '@backend/services/timerService';
import { APP_CONFIG } from '@config/app';
import { validateWeight, validateReps, validateDuration, validateDistance } from '@shared/utils/validation';
import type { WorkoutSetInput } from '@backend/models/workoutSet';
import type { Workout, WorkoutExercise, WorkoutSet, WorkoutFull, WorkoutSummary } from '@shared/types/workout';
import { WorkoutStatus } from '@shared/types/workout';

export async function updateElapsedSeconds(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  seconds: number
): Promise<void> {
  await workout.updateElapsedSeconds(db, workoutId, seconds);
}

export async function startWorkout(
  db: SQLite.SQLiteDatabase,
  typeId: string,
  name?: string | null
): Promise<Workout> {
  const active = await workout.getActive(db);
  if (active) {
    throw new Error('A workout is already in progress. Complete or discard it before starting a new one.');
  }
  return workout.create(db, typeId, name);
}

export async function addExerciseToWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  exerciseId: string,
  restSeconds?: number,
  targetRepsMin?: number | null,
  targetRepsMax?: number | null
): Promise<WorkoutExercise> {
  if (restSeconds != null) {
    return workoutExercise.addToWorkout(db, workoutId, exerciseId, restSeconds, targetRepsMin, targetRepsMax);
  }
  const ex = await exercise.getById(db, exerciseId);
  const resolvedRest = ex
    ? (ex.restSeconds ?? getDefaultRestSeconds(ex.category))
    : APP_CONFIG.defaults.restSeconds.strength;
  return workoutExercise.addToWorkout(db, workoutId, exerciseId, resolvedRest, targetRepsMin, targetRepsMax);
}

export async function continueWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<{ success: true } | { success: false; activeWorkoutId: string }> {
  const active = await workout.getActive(db);
  if (active) {
    return { success: false, activeWorkoutId: active.id };
  }
  await workout.reopen(db, workoutId);
  return { success: true };
}

export async function forceContinueWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<void> {
  const active = await workout.getActive(db);
  if (active) {
    await workout.discard(db, active.id);
  }
  await workout.reopen(db, workoutId);
}

export async function updateWorkoutExerciseRestSeconds(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string,
  restSeconds: number
): Promise<void> {
  return workoutExercise.updateRestSeconds(db, workoutExerciseId, restSeconds);
}

export async function updateExerciseTargetReps(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string,
  targetRepsMin: number | null,
  targetRepsMax: number | null
): Promise<void> {
  return workoutExercise.updateTargetReps(db, workoutExerciseId, targetRepsMin, targetRepsMax);
}

export async function logSet(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string,
  data: WorkoutSetInput
): Promise<WorkoutSet> {
  if (data.weightKg != null) {
    const err = validateWeight(data.weightKg);
    if (err) throw new Error(err);
  }
  if (data.reps != null) {
    const err = validateReps(data.reps);
    if (err) throw new Error(err);
  }
  if (data.durationSeconds != null) {
    const err = validateDuration(data.durationSeconds);
    if (err) throw new Error(err);
  }
  if (data.distanceMeters != null) {
    const err = validateDistance(data.distanceMeters);
    if (err) throw new Error(err);
  }
  return workoutSet.add(db, workoutExerciseId, data);
}

export async function updateSet(
  db: SQLite.SQLiteDatabase,
  setId: string,
  data: WorkoutSetInput
): Promise<WorkoutSet> {
  if (data.weightKg != null) {
    const err = validateWeight(data.weightKg);
    if (err) throw new Error(err);
  }
  if (data.reps != null) {
    const err = validateReps(data.reps);
    if (err) throw new Error(err);
  }
  if (data.durationSeconds != null) {
    const err = validateDuration(data.durationSeconds);
    if (err) throw new Error(err);
  }
  if (data.distanceMeters != null) {
    const err = validateDistance(data.distanceMeters);
    if (err) throw new Error(err);
  }
  return workoutSet.update(db, setId, data);
}

export async function removeSet(
  db: SQLite.SQLiteDatabase,
  setId: string
): Promise<void> {
  return workoutSet.remove(db, setId);
}

export async function reorderExercises(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  orderedIds: string[]
): Promise<void> {
  return workoutExercise.reorder(db, workoutId, orderedIds);
}

export async function removeExerciseFromWorkout(
  db: SQLite.SQLiteDatabase,
  workoutExerciseId: string
): Promise<void> {
  return workoutExercise.removeFromWorkout(db, workoutExerciseId);
}

export async function completeWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<void> {
  const sets = await workoutSet.getByWorkout(db, workoutId);
  if (sets.length === 0) {
    throw new Error('Cannot complete a workout with no logged sets.');
  }
  await workout.complete(db, workoutId);
}

export async function discardWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<void> {
  return workout.discard(db, workoutId);
}

export async function deleteWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<void> {
  return workout.remove(db, workoutId);
}

export async function deleteWorkouts(
  db: SQLite.SQLiteDatabase,
  workoutIds: string[]
): Promise<void> {
  for (const id of workoutIds) {
    await workout.remove(db, id);
  }
}

export async function getActiveWorkout(
  db: SQLite.SQLiteDatabase
): Promise<Workout | null> {
  return workout.getActive(db);
}

export async function getFullWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<WorkoutFull | null> {
  const w = await workout.getById(db, workoutId);
  if (!w) return null;

  const type = await workoutType.getById(db, w.workoutTypeId);
  if (!type) throw new Error(`WorkoutType ${w.workoutTypeId} not found`);

  const exercises = await workoutExercise.getByWorkout(db, workoutId);

  const exercisesWithSets = await Promise.all(
    exercises.map(async (ex) => {
      const sets = await workoutSet.getByWorkoutExercise(db, ex.id);
      return { ...ex, sets };
    })
  );

  return {
    ...w,
    workoutType: type,
    exercises: exercisesWithSets,
  };
}

export async function getWorkoutSummaries(
  db: SQLite.SQLiteDatabase,
  limit: number,
  offset: number
): Promise<WorkoutSummary[]> {
  type SummaryRow = {
    id: string;
    name: string | null;
    workout_type_name: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    exercise_count: number;
    set_count: number;
    total_volume: number | null;
  };

  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT
       w.id,
       w.name,
       wt.name            AS workout_type_name,
       w.status,
       w.started_at,
       w.completed_at,
       COUNT(DISTINCT we.id)                        AS exercise_count,
       COUNT(ws.id)                                 AS set_count,
       COALESCE(SUM(ws.weight_kg * ws.reps), 0)     AS total_volume
     FROM workouts w
     JOIN workout_types wt ON wt.id = w.workout_type_id
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE w.status = ?
     GROUP BY w.id
     ORDER BY w.started_at DESC
     LIMIT ? OFFSET ?`,
    WorkoutStatus.Completed,
    limit,
    offset
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    workoutTypeName: row.workout_type_name,
    status: row.status as WorkoutStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    exerciseCount: row.exercise_count,
    setCount: row.set_count,
    totalVolume: row.total_volume ?? 0,
  }));
}

export async function repeatWorkout(
  db: SQLite.SQLiteDatabase,
  sourceWorkoutId: string
): Promise<Workout> {
  const source = await getFullWorkout(db, sourceWorkoutId);
  if (!source) throw new Error('Source workout not found');

  // Generate name: "Push Day (#3)" based on how many completed workouts share the same type
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workouts WHERE workout_type_id = ? AND status = ?`,
    source.workoutTypeId,
    WorkoutStatus.Completed
  );
  const count = (countRow?.count ?? 0) + 1;
  const baseName = source.name || source.workoutType.name;
  const generatedName = `${baseName} (#${count})`;

  const newWorkout = await startWorkout(db, source.workoutTypeId, generatedName);

  for (const ex of source.exercises) {
    const newExercise = await addExerciseToWorkout(db, newWorkout.id, ex.exerciseId, ex.restSeconds, ex.targetRepsMin, ex.targetRepsMax);
    // Pre-create the same number of empty sets as the source exercise had
    for (let i = 0; i < ex.sets.length; i++) {
      await workoutSet.add(db, newExercise.id);
    }
  }

  return newWorkout;
}

export async function getPreviousSetsForExercises(
  db: SQLite.SQLiteDatabase,
  exerciseIds: string[]
): Promise<Map<string, WorkoutSet[]>> {
  return workoutSet.getLatestSetsForExercises(db, exerciseIds);
}

export async function getFullWorkoutsByIds(
  db: SQLite.SQLiteDatabase,
  ids: string[]
): Promise<WorkoutFull[]> {
  const results = await Promise.all(ids.map((id) => getFullWorkout(db, id)));
  return results.filter((w): w is WorkoutFull => w !== null);
}

export async function getWorkoutSummaryCount(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workouts WHERE status = ?`,
    WorkoutStatus.Completed
  );
  return row?.count ?? 0;
}
