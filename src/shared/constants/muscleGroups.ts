/** Muscle group constants - enum values and display labels for all muscle groups. */
import { MuscleGroup } from '@shared/types/exercise';

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  [MuscleGroup.Chest]: 'Chest',
  [MuscleGroup.Back]: 'Back',
  [MuscleGroup.FrontDelt]: 'Front Delt',
  [MuscleGroup.SideDelt]: 'Side Delt',
  [MuscleGroup.RearDelt]: 'Rear Delt',
  [MuscleGroup.Biceps]: 'Biceps',
  [MuscleGroup.Triceps]: 'Triceps',
  [MuscleGroup.Quads]: 'Quads',
  [MuscleGroup.Hamstrings]: 'Hamstrings',
  [MuscleGroup.Glutes]: 'Glutes',
  [MuscleGroup.Calves]: 'Calves',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.FullBody]: 'Full Body',
  [MuscleGroup.Forearms]: 'Forearms',
};

export const ALL_MUSCLE_GROUPS = Object.values(MuscleGroup);

/** Display order for muscle group pills and lists. */
export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  MuscleGroup.Chest,
  MuscleGroup.Back,
  MuscleGroup.FrontDelt,
  MuscleGroup.SideDelt,
  MuscleGroup.RearDelt,
  MuscleGroup.Triceps,
  MuscleGroup.Biceps,
  MuscleGroup.Forearms,
  MuscleGroup.Quads,
  MuscleGroup.Hamstrings,
  MuscleGroup.Core,
  MuscleGroup.Glutes,
  MuscleGroup.Calves,
  MuscleGroup.FullBody,
];
