/** Split types - workout split planning (ordered workout/rest days applied for N cycles). */

export type SplitDayType = 'workout' | 'rest';

export interface Split {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface SplitDay {
  id: string;
  splitId: string;
  sortOrder: number;
  dayType: SplitDayType;
  seriesId: string | null;
  label: string | null;
  createdAt: string;
}

/** A split day with its linked series name resolved (null for rest days / dangling series). */
export interface SplitDayFull extends SplitDay {
  seriesName: string | null;
}

export interface SplitFull extends Split {
  days: SplitDayFull[];
}

/** Read-only view of a series' template structure, used to preview a split's workout days. */
export interface SeriesTemplateExercise {
  slotId: string;
  exerciseId: string;
  exerciseName: string;
  restSeconds: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  repGoalType: 'range' | 'amrap';
  note: string | null;
  alternatives: { exerciseId: string; exerciseName: string }[];
}

export interface SeriesTemplate {
  seriesId: string;
  seriesName: string;
  exercises: SeriesTemplateExercise[];
}
