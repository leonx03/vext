/** Body weight types - TypeScript interfaces for body weight tracking entries. */
export interface BodyWeightEntry {
  id: string;
  weightKg: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;
}

/** A week's average body weight, aggregated from the daily entries in that week. */
export interface WeeklyAverageWeight {
  weekStart: string; // YYYY-MM-DD, the Monday of the week
  avgWeightKg: number;
  entryCount: number;
}
