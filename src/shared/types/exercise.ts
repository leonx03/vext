/** Exercise types - TypeScript interfaces for Exercise, ExerciseCategory, MuscleGroup, Equipment. */
export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  FrontDelt = 'front_delt',
  SideDelt = 'side_delt',
  RearDelt = 'rear_delt',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Quads = 'quads',
  Hamstrings = 'hamstrings',
  Glutes = 'glutes',
  Calves = 'calves',
  Core = 'core',
  FullBody = 'full_body',
  Forearms = 'forearms',
}

export enum Equipment {
  Barbell = 'barbell',
  Dumbbell = 'dumbbell',
  Machine = 'machine',
  Cable = 'cable',
  Bodyweight = 'bodyweight',
  CardioMachine = 'cardio_machine',
  None = 'none',
}

export enum ExerciseCategory {
  Strength = 'strength',
  Cardio = 'cardio',
  Flexibility = 'flexibility',
}

/**
 * How an exercise's sets are measured, independent of the workout type:
 * - `weighted` — weight (kg) × reps. Default; unchanged behavior.
 * - `time` — a single duration-in-seconds field (a hold), optionally AMRAP ("max hold").
 * - `bodyweight` — a free-text load ("bw" / "green band" / "+5kg") × reps, stored on the set.
 */
export enum ExerciseTrackingType {
  Weighted = 'weighted',
  Time = 'time',
  Bodyweight = 'bodyweight',
}

export const TRACKING_TYPE_LABELS: Record<ExerciseTrackingType, string> = {
  [ExerciseTrackingType.Weighted]: 'Weight × reps',
  [ExerciseTrackingType.Time]: 'Time',
  [ExerciseTrackingType.Bodyweight]: 'Bodyweight',
};

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string | null;
  restSeconds: number | null;
  trackingType: ExerciseTrackingType;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface ExerciseSeed {
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string | null;
  restSeconds?: number | null;
  trackingType?: ExerciseTrackingType;
}
