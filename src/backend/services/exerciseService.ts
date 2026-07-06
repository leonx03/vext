/** Exercise service - business logic for creating, updating, and archiving exercises. */
import type * as SQLite from 'expo-sqlite';
import * as exerciseModel from '@backend/models/exercise';
import type { Exercise, ExerciseCategory, ExerciseTrackingType, Equipment, MuscleGroup } from '@shared/types/exercise';

export async function updateDefaultRestSeconds(
  db: SQLite.SQLiteDatabase,
  exerciseId: string,
  restSeconds: number | null
): Promise<void> {
  return exerciseModel.updateRestSeconds(db, exerciseId, restSeconds);
}

export async function createExercise(
  db: SQLite.SQLiteDatabase,
  data: {
    name: string;
    category: ExerciseCategory;
    primaryMuscles: MuscleGroup[];
    equipment: Equipment;
    instructions?: string | null;
    restSeconds?: number | null;
    trackingType?: ExerciseTrackingType;
  }
): Promise<Exercise> {
  return exerciseModel.create(db, data);
}

export async function updateExercise(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: {
    name?: string;
    category?: ExerciseCategory;
    primaryMuscles?: MuscleGroup[];
    equipment?: Equipment;
    instructions?: string | null;
    restSeconds?: number | null;
    trackingType?: ExerciseTrackingType;
  }
): Promise<Exercise> {
  return exerciseModel.update(db, id, data);
}

export async function archiveExercise(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  return exerciseModel.archive(db, id);
}
