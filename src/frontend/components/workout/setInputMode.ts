/**
 * setInputMode - resolves how a set's inputs are rendered/logged, combining the workout type
 * (Strength vs Cardio) with the exercise's per-exercise tracking type. Cardio workouts keep the
 * duration+distance inputs regardless of tracking type; within a strength workout the exercise's
 * tracking type decides.
 */
import { ExerciseTrackingType } from '@shared/types/exercise';

export type SetInputMode = 'weighted' | 'time' | 'bodyweight' | 'cardio';

export function getSetInputMode(isStrength: boolean, trackingType: ExerciseTrackingType): SetInputMode {
  if (!isStrength) return 'cardio';
  switch (trackingType) {
    case ExerciseTrackingType.Time:
      return 'time';
    case ExerciseTrackingType.Bodyweight:
      return 'bodyweight';
    default:
      return 'weighted';
  }
}

/** A set counts as "done" (for auto-collapse) once its mode's primary field(s) are filled. */
export function isSetComplete(mode: SetInputMode, set: { weightKg: number | null; reps: number | null; durationSeconds: number | null; customFields: Record<string, unknown> | null }): boolean {
  switch (mode) {
    case 'weighted':
      return set.weightKg != null && set.reps != null;
    case 'bodyweight':
      return set.reps != null;
    case 'time':
    case 'cardio':
      return set.durationSeconds != null;
  }
}

/** The free-text load a bodyweight set was logged with (e.g. "bw", "green band", "+5kg"). */
export function getSetLoad(set: { customFields: Record<string, unknown> | null }): string | null {
  const load = set.customFields?.load;
  return typeof load === 'string' && load.length > 0 ? load : null;
}
