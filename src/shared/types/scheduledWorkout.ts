/** Scheduled workout types - TypeScript interfaces for future workout scheduling. */
export interface ScheduledWorkout {
  id: string;
  seriesId: string;
  seriesName: string;
  scheduledDate: string; // YYYY-MM-DD
  notes: string | null;
  startedWorkoutId: string | null;
  workoutStatus: string | null; // status of the started workout, null if not started
  createdAt: string;
}
