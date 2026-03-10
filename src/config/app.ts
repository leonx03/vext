/** App config - schema version, default values, and app-wide constants. */
export const APP_CONFIG = {
  database: {
    name: 'vext.db',
    schemaVersion: 8,
  },
  defaults: {
    restSeconds: {
      strength: 90,
      cardio: 60,
      flexibility: 60,
    },
    units: 'metric' as const,
    historyPageSize: 20,
    searchDebounceMs: 300,
  },
  validation: {
    weight: { min: 0, max: 9999 },
    reps: { min: 1, max: 9999 },
    duration: { min: 1, max: 359999 }, // seconds (99:59:59)
    distance: { min: 0.01, max: 9999.99 },
    exerciseName: { min: 1, max: 100 },
    workoutName: { min: 0, max: 200 },
    notes: { min: 0, max: 1000 },
  },
} as const;
