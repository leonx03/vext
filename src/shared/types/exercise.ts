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

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string | null;
  restSeconds: number | null;
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
}
