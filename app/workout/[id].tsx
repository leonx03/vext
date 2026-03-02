/** Active workout screen - log sets, manage exercises, and complete/discard a workout. */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActiveWorkoutHeader } from '@frontend/components/workout/ActiveWorkoutHeader';
import { ExerciseCard } from '@frontend/components/workout/ExerciseCard';
import { ExercisePicker } from '@frontend/components/overlay/ExercisePicker';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { EmptyState } from '@frontend/components/EmptyState';
import { RestTimer } from '@frontend/components/workout/RestTimer';
import { useTimerStore } from '@frontend/hooks/useTimer';
import {
  useFullWorkout,
  useAddExercise,
  useLogSet,
  useUpdateSet,
  useRemoveSet,
  useRemoveExercise,
  useReorderExercises,
  useCompleteWorkout,
  useDiscardWorkout,
  useUpdateWorkoutExerciseRestSeconds,
  useUpdateExerciseTargetReps,
  useUpdateElapsedSeconds,
} from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import type { Exercise } from '@shared/types/exercise';
import type { WorkoutFull } from '@shared/types/workout';
import { cn } from '@frontend/lib/utils';
import { useExerciseOrderStore } from '@frontend/hooks/useExerciseOrderStore';
import { useWorkoutTimer } from '@frontend/hooks/useWorkoutTimer';

/** Inner component — only mounts once workout data is available, so useWorkoutTimer gets the correct initialElapsed. */
function ActiveWorkoutContent({ workout, id }: { workout: WorkoutFull; id: string }) {
  const router = useRouter();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const startTimer = useTimerStore((s) => s.startTimer);
  const exerciseIds = React.useMemo(
    () => workout.exercises.map((ex) => ex.exerciseId),
    [workout.exercises]
  );
  const { data: previousSetsMap } = usePreviousSetsForExercises(exerciseIds);
  const addExercise = useAddExercise(id);
  const logSet = useLogSet(id);
  const updateSet = useUpdateSet(id);
  const removeSet = useRemoveSet(id);
  const removeExercise = useRemoveExercise(id);
  const reorderExercises = useReorderExercises(id);
  const completeWorkout = useCompleteWorkout();
  const discardWorkout = useDiscardWorkout();
  const updateRestSeconds = useUpdateWorkoutExerciseRestSeconds(id);
  const updateTargetReps = useUpdateExerciseTargetReps(id);
  const updateElapsed = useUpdateElapsedSeconds(id);

  const { elapsed, clear: clearTimer } = useWorkoutTimer(
    id,
    workout.elapsedSeconds,
    (seconds) => updateElapsed.mutate(seconds)
  );

  const optimisticOrder = useExerciseOrderStore((s) => s.orders[id]);
  const setOrder = useExerciseOrderStore((s) => s.setOrder);

  const exercises = React.useMemo(() => {
    if (!optimisticOrder) return workout.exercises;
    return optimisticOrder
      .map((eid) => workout.exercises.find((e) => e.id === eid))
      .filter(Boolean) as typeof workout.exercises;
  }, [workout, optimisticOrder]);

  const handleAddExercise = (exercise: Exercise) => {
    addExercise.mutate({ exerciseId: exercise.id });
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const newOrder = [...exercises];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    const orderedIds = newOrder.map((e) => e.id);
    setOrder(id, orderedIds);
    reorderExercises.mutate(orderedIds);
  };

  const handleComplete = async () => {
    try {
      await completeWorkout.mutateAsync(id);
      clearTimer(id);
      router.replace('/(tabs)/workouts');
    } catch {
      // mutation errors shown inline via completeWorkout.error
    }
  };

  const handleDiscard = async () => {
    await discardWorkout.mutateAsync(id);
    clearTimer(id);
    setShowDiscardConfirm(false);
    router.replace('/(tabs)');
  };

  const isStrength = workout.workoutType.name === 'Strength Training';

  return (
    <View className="flex-1 bg-background">
      <ActiveWorkoutHeader
        workoutName={workout.name}
        workoutTypeName={workout.workoutType.name}
        elapsed={elapsed}
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName={cn(exercises.length === 0 ? 'flex-1' : 'pb-[120px]')}
      >
        {exercises.length === 0 ? (
          <EmptyState
            icon="add-circle-outline"
            title="No exercises yet"
            message="Add an exercise to get started"
            actionLabel="Add Exercise"
            onAction={() => setShowExercisePicker(true)}
          />
        ) : (
          exercises.map((item, index) => (
            <ExerciseCard
              key={item.id}
              exercise={item}
              isStrength={isStrength}
              previousSets={previousSetsMap?.get(item.exerciseId)}
              onMoveUp={index > 0 && !reorderExercises.isPending ? () => handleMoveExercise(index, 'up') : undefined}
              onMoveDown={index < exercises.length - 1 && !reorderExercises.isPending ? () => handleMoveExercise(index, 'down') : undefined}
              onAddSet={() => {
                logSet.mutate({ workoutExerciseId: item.id, data: {} });
              }}
              onSaveSet={(setId, data) => {
                updateSet.mutate({ setId, data });
                startTimer(item.restSeconds);
              }}
              onRemoveSet={(setId) => removeSet.mutate(setId)}
              onRemoveExercise={() => removeExercise.mutate(item.id)}
              onUpdateRestSeconds={(seconds) => updateRestSeconds.mutate({ workoutExerciseId: item.id, restSeconds: seconds })}
              onUpdateTargetReps={(min, max) => updateTargetReps.mutate({ workoutExerciseId: item.id, targetRepsMin: min, targetRepsMax: max })}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View className="bg-background border-t border-background-100 px-4 pb-8 pt-3">
        {(completeWorkout.error || logSet.error) && (
          <Text className="text-xs text-destructive text-center mb-2">
            {(completeWorkout.error as Error)?.message || (logSet.error as Error)?.message}
          </Text>
        )}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setShowDiscardConfirm(true)}
            className="flex-1 rounded-xl border border-destructive py-3.5 items-center"
          >
            <Text className="text-sm font-semibold text-destructive">Discard</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowExercisePicker(true)}
            className="flex-1 rounded-xl border border-background-100 py-3.5 items-center"
          >
            <Text className="text-sm font-semibold text-foreground">Add Exercise</Text>
          </Pressable>

          <Pressable
            onPress={handleComplete}
            disabled={completeWorkout.isPending}
            className="flex-1 rounded-xl bg-primary py-3.5 items-center"
          >
            <Text className="text-sm font-bold text-background">
              {completeWorkout.isPending ? 'Saving...' : 'Finish'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ExercisePicker
        visible={showExercisePicker}
        onSelect={handleAddExercise}
        onClose={() => setShowExercisePicker(false)}
      />

      <ConfirmDialog
        visible={showDiscardConfirm}
        title="Discard Workout"
        message="All logged sets will be lost. This cannot be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      <RestTimer />
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isLoading } = useFullWorkout(id);

  if (isLoading || !workout) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="rgb(52, 211, 153)" />
      </View>
    );
  }

  return <ActiveWorkoutContent workout={workout} id={id!} />;
}
