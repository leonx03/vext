/** Tracks time spent actively viewing a specific workout screen. Pauses when navigating away, persists to DB on blur. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { create } from 'zustand';

interface TimerState {
  accumulated: number; // seconds built up in previous focus sessions
  focusedAt: number | null; // Date.now() when screen last focused, null if not focused
}

interface WorkoutTimerStore {
  timers: Record<string, TimerState>;
  onFocus: (workoutId: string, initialElapsed: number) => void;
  onBlur: (workoutId: string) => void;
  clear: (workoutId: string) => void;
}

const useWorkoutTimerStore = create<WorkoutTimerStore>((set) => ({
  timers: {},
  onFocus: (workoutId, initialElapsed) =>
    set((state) => ({
      timers: {
        ...state.timers,
        [workoutId]: {
          // Preserve accumulated if already tracked in this session, else seed from DB
          accumulated: state.timers[workoutId]?.accumulated ?? initialElapsed,
          focusedAt: Date.now(),
        },
      },
    })),
  onBlur: (workoutId) =>
    set((state) => {
      const timer = state.timers[workoutId];
      if (!timer?.focusedAt) return state;
      const delta = Math.floor((Date.now() - timer.focusedAt) / 1000);
      return {
        timers: {
          ...state.timers,
          [workoutId]: { accumulated: timer.accumulated + delta, focusedAt: null },
        },
      };
    }),
  clear: (workoutId) =>
    set((state) => {
      const { [workoutId]: _, ...rest } = state.timers;
      return { timers: rest };
    }),
}));

export function useWorkoutTimer(
  workoutId: string,
  initialElapsed: number,
  onSave: (seconds: number) => void
) {
  const onFocus = useWorkoutTimerStore((s) => s.onFocus);
  const onBlur = useWorkoutTimerStore((s) => s.onBlur);
  const clear = useWorkoutTimerStore((s) => s.clear);
  const timer = useWorkoutTimerStore((s) => s.timers[workoutId]);

  // Stable ref so the focus effect doesn't need onSave as a dependency
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Force a re-render each second while focused so the display updates
  const [, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      onFocus(workoutId, initialElapsed);
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => {
        clearInterval(interval);
        // Read current state directly to get the latest value at blur time
        const current = useWorkoutTimerStore.getState().timers[workoutId];
        if (current) {
          const total = current.accumulated +
            (current.focusedAt ? Math.floor((Date.now() - current.focusedAt) / 1000) : 0);
          onSaveRef.current(total);
        }
        onBlur(workoutId);
      };
    }, [workoutId, initialElapsed, onFocus, onBlur])
  );

  const elapsed = timer
    ? timer.accumulated +
      (timer.focusedAt ? Math.floor((Date.now() - timer.focusedAt) / 1000) : 0)
    : initialElapsed;

  return { elapsed, clear };
}
