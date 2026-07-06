/** Database seed - populates default workout types and exercises on first run. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SEED_EXERCISES } from '@shared/constants/exercises';
import type { WorkoutFieldDefinition } from '@shared/types/workout';

interface DefaultWorkoutType {
  name: string;
  fields: WorkoutFieldDefinition[];
}

const DEFAULT_WORKOUT_TYPES: DefaultWorkoutType[] = [
  {
    name: 'Strength Training',
    fields: [
      { name: 'weight', type: 'number', unit: 'kg', required: true },
      { name: 'reps', type: 'number', required: true },
    ],
  },
  {
    name: 'Cardio Session',
    fields: [
      { name: 'duration', type: 'duration', required: true },
      { name: 'distance', type: 'distance', unit: 'meters', required: false },
    ],
  },
  {
    name: 'Flexibility/Stretching',
    fields: [
      { name: 'duration', type: 'duration', required: true },
    ],
  },
];

export async function seedDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check if seed data already exists
  const existingExercise = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE is_default = 1'
  );
  if (existingExercise && existingExercise.count > 0) return;

  await db.withTransactionAsync(async () => {
    // Seed workout types
    for (const wt of DEFAULT_WORKOUT_TYPES) {
      const id = Crypto.randomUUID();
      await db.runAsync(
        'INSERT INTO workout_types (id, name, fields, is_default) VALUES (?, ?, ?, 1)',
        id,
        wt.name,
        JSON.stringify(wt.fields)
      );
    }

    // Seed exercises
    for (const exercise of SEED_EXERCISES) {
      const id = Crypto.randomUUID();
      await db.runAsync(
        'INSERT INTO exercises (id, name, category, primary_muscles, equipment, instructions, tracking_type, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        id,
        exercise.name,
        exercise.category,
        JSON.stringify(exercise.primaryMuscles),
        exercise.equipment,
        exercise.instructions,
        exercise.trackingType ?? 'weighted'
      );
    }
  });
}
