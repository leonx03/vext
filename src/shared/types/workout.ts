/** Workout types - TypeScript interfaces for Workout, WorkoutExercise, WorkoutSet, and related types. */
export enum WorkoutStatus {
  InProgress = 'in_progress',
  Completed = 'completed',
  Discarded = 'discarded',
}

export interface WorkoutFieldDefinition {
  name: string;
  type: 'number' | 'duration' | 'distance' | 'text';
  unit?: string;
  required: boolean;
}

export interface WorkoutType {
  id: string;
  name: string;
  fields: WorkoutFieldDefinition[];
  isDefault: boolean;
  createdAt: string;
}

export interface Workout {
  id: string;
  workoutTypeId: string;
  name: string | null;
  status: WorkoutStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  elapsedSeconds: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  restSeconds: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  notes: string | null;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  customFields: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
}

/** Workout with all nested data for detail views */
export interface WorkoutFull extends Workout {
  workoutType: WorkoutType;
  exercises: WorkoutExerciseFull[];
}

export interface WorkoutExerciseFull extends WorkoutExercise {
  exerciseName: string;
  exerciseCategory: string;
  sets: WorkoutSet[];
}

/** Summary for history list items */
export interface WorkoutSummary {
  id: string;
  name: string | null;
  workoutTypeName: string;
  status: WorkoutStatus;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

/** Grouped repeated workouts for history list */
export interface WorkoutGroup {
  key: string;
  displayName: string;
  workoutTypeName: string;
  latest: WorkoutSummary;
  sessions: WorkoutSummary[];
}
