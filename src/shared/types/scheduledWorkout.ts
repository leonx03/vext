/** Scheduled workout types - TypeScript interfaces for future workout scheduling. */
export interface ScheduledWorkout {
  id: string;
  seriesId: string;
  seriesName: string;
  scheduledDate: string; // YYYY-MM-DD
  notes: string | null;
  startedWorkoutId: string | null;
  createdAt: string;
}
