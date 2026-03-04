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
} from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import { ExerciseCategory } from '@shared/types/exercise';
import type { Exercise } from '@shared/types/exercise';
import type { WorkoutFull, WorkoutFieldDefinition } from '@shared/types/workout';

function categoryFromFields(fields: WorkoutFieldDefinition[]): ExerciseCategory | undefined {
  if (fields.some((f) => f.name === 'weight')) return ExerciseCategory.Strength;
  if (fields.some((f) => f.type === 'distance')) return ExerciseCategory.Cardio;
  if (fields.some((f) => f.type === 'duration')) return ExerciseCategory.Flexibility;
  return undefined;
}
import { cn } from '@frontend/lib/utils';
/** Inner component — only mounts once workout data is available. */
function ActiveWorkoutContent({ workout, id }: { workout: WorkoutFull; id: string }) {
  const router = useRouter();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const startTimer = useTimerStore((s) => s.startTimer);
  const exerciseIds = React.useMemo(
    () => workout.exercises.map((ex) => ex.exerciseId),
    [workout.exercises]
  );
  const { data: previousSetsMap } = usePreviousSetsForExercises(exerciseIds, workout.seriesId);
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

  const exercises = workout.exercises;

  const handleAddExercise = (exercise: Exercise) => {
    addExercise.mutate({ exerciseId: exercise.id });
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const newOrder = [...exercises];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    const orderedIds = newOrder.map((e) => e.id);
    reorderExercises.mutate(orderedIds);
  };

  const handleComplete = async () => {
    try {
      await completeWorkout.mutateAsync(id);
      router.replace('/(tabs)/workouts');
    } catch {
      // mutation errors shown inline via completeWorkout.error
    }
  };

  const handleDiscard = async () => {
    await discardWorkout.mutateAsync(id);
    setShowDiscardConfirm(false);
    router.replace('/(tabs)');
  };

  const isStrength = workout.workoutType.name === 'Strength Training';

  return (
    <View className="flex-1 bg-background">
      <ActiveWorkoutHeader
        workoutName={workout.name}
        workoutTypeName={workout.workoutType.name}
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
              onMoveUp={index > 0 ? () => handleMoveExercise(index, 'up') : undefined}
              onMoveDown={index < exercises.length - 1 ? () => handleMoveExercise(index, 'down') : undefined}
              onAddSet={() => {
                logSet.mutate({ workoutExerciseId: item.id, data: {} });
              }}
              onSaveSet={(setId, data) => updateSet.mutate({ setId, data })}
              onStartRest={item.restSeconds > 0 ? () => startTimer(item.restSeconds) : undefined}
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
        defaultCategory={categoryFromFields(workout.workoutType.fields)}
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
