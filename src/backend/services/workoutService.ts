/** Workout service - orchestrates workout lifecycle, set logging, and exercise management. */
import * as Crypto from 'expo-crypto';
import type * as SQLite from 'expo-sqlite';
import * as workout from '@backend/models/workout';
import * as workoutExercise from '@backend/models/workoutExercise';
import * as workoutSet from '@backend/models/workoutSet';
import * as workoutType from '@backend/models/workoutType';
import * as exercise from '@backend/models/exercise';
import * as supersetGroupModel from '@backend/models/supersetGroup';
import { getDefaultRestSeconds } from '@backend/services/timerService';
import { APP_CONFIG } from '@config/app';
import { validateWeight, validateReps, validateDuration, validateDistance } from '@shared/utils/validation';
import type { WorkoutSetInput } from '@backend/models/workoutSet';
import type { Workout, WorkoutExercise, WorkoutSet, WorkoutFull, WorkoutSummary, SupersetGroup } from '@shared/types/workout';
import { WorkoutStatus } from '@shared/types/workout';


export async function startWorkout(
  db: SQLite.SQLiteDatabase,
  typeId: string,
  name?: string | null,
  seriesId?: string | null
): Promise<Workout> {
  const active = await workout.getActive(db);
  if (active) {
    throw new Error('A workout is already in progress. Complete or discard it before starting a new one.');
  }
  return workout.create(db, typeId, name, seriesId);
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
  const ex = await workoutExercise.getById(db, workoutExerciseId);
  const supersetGroupId = ex?.supersetGroupId ?? null;

  await workoutExercise.removeFromWorkout(db, workoutExerciseId);

  if (supersetGroupId) {
    const remaining = await workoutExercise.getBySuperset(db, supersetGroupId);
    if (remaining.length <= 1) {
      await disbandSuperset(db, supersetGroupId);
    }
  }
}

export async function makeSuperset(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  existingWorkoutExerciseId: string,
  newExerciseId: string
): Promise<SupersetGroup> {
  const group = await supersetGroupModel.create(db, workoutId, 90);
  await workoutExercise.assignToSuperset(db, existingWorkoutExerciseId, group.id, 1);
  const newEx = await addExerciseToWorkout(db, workoutId, newExerciseId);
  await workoutExercise.assignToSuperset(db, newEx.id, group.id, 2);

  // Pre-create empty sets for the new exercise to match existing rounds
  const existingSets = await workoutSet.getByWorkoutExercise(db, existingWorkoutExerciseId);
  for (let i = 0; i < existingSets.length; i++) {
    await workoutSet.add(db, newEx.id);
  }

  return group;
}

export async function addExerciseToSuperset(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  groupId: string,
  newExerciseId: string
): Promise<void> {
  const existing = await workoutExercise.getBySuperset(db, groupId);
  const nextPosition = existing.length + 1;
  const newEx = await addExerciseToWorkout(db, workoutId, newExerciseId);
  await workoutExercise.assignToSuperset(db, newEx.id, groupId, nextPosition);

  // Pre-create empty sets to match existing round count so inputs appear immediately
  if (existing.length > 0) {
    const setCounts = await Promise.all(
      existing.map((ex) => workoutSet.getByWorkoutExercise(db, ex.id).then((s) => s.length))
    );
    const maxRounds = Math.max(0, ...setCounts);
    for (let i = 0; i < maxRounds; i++) {
      await workoutSet.add(db, newEx.id);
    }
  }
}

export async function disbandSuperset(
  db: SQLite.SQLiteDatabase,
  groupId: string
): Promise<void> {
  const exercises = await workoutExercise.getBySuperset(db, groupId);
  for (const ex of exercises) {
    await workoutExercise.removeFromSuperset(db, ex.id);
  }
  await supersetGroupModel.deleteGroup(db, groupId);
}

export async function updateSupersetRestSeconds(
  db: SQLite.SQLiteDatabase,
  groupId: string,
  restSeconds: number
): Promise<void> {
  await supersetGroupModel.updateRestSeconds(db, groupId, restSeconds);
}

export async function logSupersetRound(
  db: SQLite.SQLiteDatabase,
  groupId: string
): Promise<void> {
  const exercises = await workoutExercise.getBySuperset(db, groupId);
  for (const ex of exercises) {
    await workoutSet.add(db, ex.id);
  }
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
  await db.withTransactionAsync(async () => {
    for (const id of workoutIds) {
      await workout.remove(db, id);
    }
  });
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

  const supersetGroups = await supersetGroupModel.getByWorkout(db, workoutId);

  return {
    ...w,
    workoutType: type,
    exercises: exercisesWithSets,
    supersetGroups,
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
    elapsed_seconds: number;
  };

  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT
       w.id,
       w.name,
       wt.name            AS workout_type_name,
       w.status,
       w.started_at,
       w.completed_at,
       w.elapsed_seconds,
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

  if (rows.length === 0) return [];

  // Batch-fetch muscle group set counts for all returned workouts
  const workoutIds = rows.map((r) => r.id);
  const placeholders = workoutIds.map(() => '?').join(', ');
  const muscleRows = await db.getAllAsync<{ workout_id: string; muscle_group: string; set_count: number }>(
    `SELECT we.workout_id, jm.value AS muscle_group, COUNT(ws.id) AS set_count
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     JOIN json_each(e.primary_muscles) jm
     JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE we.workout_id IN (${placeholders})
     GROUP BY we.workout_id, jm.value`,
    ...workoutIds
  );

  const muscleMap = new Map<string, Record<string, number>>();
  for (const mr of muscleRows) {
    if (!muscleMap.has(mr.workout_id)) muscleMap.set(mr.workout_id, {});
    muscleMap.get(mr.workout_id)![mr.muscle_group] = mr.set_count;
  }

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
    elapsedSeconds: row.elapsed_seconds,
    muscleGroupSets: muscleMap.get(row.id) ?? {},
  }));
}

export async function repeatWorkout(
  db: SQLite.SQLiteDatabase,
  sourceWorkoutId: string
): Promise<Workout> {
  const source = await getFullWorkout(db, sourceWorkoutId);
  if (!source) throw new Error('Source workout not found');

  const name = source.name || source.workoutType.name;

  // Inherit the source's series_id, or create a new series and tag the source too
  let seriesId = source.seriesId;
  if (!seriesId) {
    seriesId = Crypto.randomUUID();
    await db.runAsync(`UPDATE workouts SET series_id = ? WHERE id = ?`, seriesId, source.id);
  }

  const newWorkout = await startWorkout(db, source.workoutTypeId, name, seriesId);

  // Map old superset group IDs to new ones for the repeated workout
  const groupIdMap = new Map<string, string>();

  for (const ex of source.exercises) {
    const newExercise = await addExerciseToWorkout(db, newWorkout.id, ex.exerciseId, ex.restSeconds, ex.targetRepsMin, ex.targetRepsMax);

    if (ex.supersetGroupId) {
      if (!groupIdMap.has(ex.supersetGroupId)) {
        const oldGroup = source.supersetGroups.find((g) => g.id === ex.supersetGroupId);
        const newGroup = await supersetGroupModel.create(db, newWorkout.id, oldGroup?.restSeconds ?? 90);
        groupIdMap.set(ex.supersetGroupId, newGroup.id);
      }
      const newGroupId = groupIdMap.get(ex.supersetGroupId)!;
      await workoutExercise.assignToSuperset(db, newExercise.id, newGroupId, ex.supersetPosition ?? 0);
    }

    // Pre-create the same number of empty sets as the source exercise had
    for (let i = 0; i < ex.sets.length; i++) {
      await workoutSet.add(db, newExercise.id);
    }
  }

  return newWorkout;
}

export async function getPreviousSetsForExercises(
  db: SQLite.SQLiteDatabase,
  exerciseIds: string[],
  seriesId?: string | null
): Promise<Map<string, WorkoutSet[]>> {
  return workoutSet.getLatestSetsForExercises(db, exerciseIds, seriesId);
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
