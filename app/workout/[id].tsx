/** Active workout screen - log sets, manage exercises, and complete/discard a workout. */
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActiveWorkoutHeader } from '@frontend/components/workout/ActiveWorkoutHeader';
import { ExerciseCard } from '@frontend/components/workout/ExerciseCard';
import { SupersetCard } from '@frontend/components/workout/SupersetCard';
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
  useMakeSuperset,
  useAddExerciseToSuperset,
  useDisbandSuperset,
  useUpdateSupersetRestSeconds,
  useLogSupersetRound,
  useSwitchWorkoutExercise,
} from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import { ExerciseCategory } from '@shared/types/exercise';
import type { Exercise } from '@shared/types/exercise';
import type { WorkoutExerciseFull, WorkoutFull, WorkoutFieldDefinition } from '@shared/types/workout';
import { cn } from '@frontend/lib/utils';

function categoryFromFields(fields: WorkoutFieldDefinition[]): ExerciseCategory | undefined {
  if (fields.some((f) => f.name === 'weight')) return ExerciseCategory.Strength;
  if (fields.some((f) => f.type === 'distance')) return ExerciseCategory.Cardio;
  if (fields.some((f) => f.type === 'duration')) return ExerciseCategory.Flexibility;
  return undefined;
}

type PickerMode =
  | { type: 'add' }
  | { type: 'makeSuperset'; workoutExerciseId: string }
  | { type: 'addToSuperset'; groupId: string };

type RenderItem =
  | { type: 'standalone'; exercise: WorkoutExerciseFull }
  | { type: 'superset'; groupId: string; exercises: WorkoutExerciseFull[] };

/** Inner component — only mounts once workout data is available. */
function ActiveWorkoutContent({ workout, id }: { workout: WorkoutFull; id: string }) {
  const router = useRouter();
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [flexenDone, setFlexenDone] = useState(false);

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
  const switchExercise = useSwitchWorkoutExercise(id);
  const makeSuperset = useMakeSuperset(id);
  const addToSuperset = useAddExerciseToSuperset(id);
  const disbandSuperset = useDisbandSuperset(id);
  const updateSupersetRest = useUpdateSupersetRestSeconds(id);
  const logSupersetRound = useLogSupersetRound(id);

  const exercises = workout.exercises;

  // Group exercises into render items: standalone or superset
  const renderItems = React.useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    const seen = new Set<string>();

    for (const ex of exercises) {
      if (!ex.supersetGroupId) {
        items.push({ type: 'standalone', exercise: ex });
      } else if (!seen.has(ex.supersetGroupId)) {
        seen.add(ex.supersetGroupId);
        const groupExercises = exercises
          .filter((e) => e.supersetGroupId === ex.supersetGroupId)
          .sort((a, b) => (a.supersetPosition ?? 0) - (b.supersetPosition ?? 0));
        items.push({ type: 'superset', groupId: ex.supersetGroupId, exercises: groupExercises });
      }
    }

    return items;
  }, [exercises]);

  const handlePickerSelect = (exercise: Exercise) => {
    if (!pickerMode) return;

    if (pickerMode.type === 'add') {
      addExercise.mutate({ exerciseId: exercise.id });
    } else if (pickerMode.type === 'makeSuperset') {
      makeSuperset.mutate({
        workoutExerciseId: pickerMode.workoutExerciseId,
        newExerciseId: exercise.id,
      });
    } else if (pickerMode.type === 'addToSuperset') {
      addToSuperset.mutate({ groupId: pickerMode.groupId, newExerciseId: exercise.id });
    }

    setPickerMode(null);
  };

  const handleMoveItem = (renderIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? renderIndex - 1 : renderIndex + 1;
    if (targetIndex < 0 || targetIndex >= renderItems.length) return;

    const newItems = [...renderItems];
    [newItems[renderIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[renderIndex]];

    const orderedIds = newItems.flatMap((item) =>
      item.type === 'standalone' ? [item.exercise.id] : item.exercises.map((e: WorkoutExerciseFull) => e.id)
    );
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
            onAction={() => setPickerMode({ type: 'add' })}
          />
        ) : (
          renderItems.map((item, renderIndex) => {
            const isFirst = renderIndex === 0;
            const isLast = renderIndex === renderItems.length - 1;

            if (item.type === 'standalone') {
              const ex = item.exercise;
              return (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  isStrength={isStrength}
                  seriesId={workout.seriesId}
                  previousSets={previousSetsMap?.get(ex.exerciseId)}
                  onMoveUp={!isFirst ? () => handleMoveItem(renderIndex, 'up') : undefined}
                  onMoveDown={!isLast ? () => handleMoveItem(renderIndex, 'down') : undefined}
                  onAddSet={() => logSet.mutate({ workoutExerciseId: ex.id, data: {} })}
                  onSaveSet={(setId, data) => updateSet.mutate({ setId, data })}
                  onStartRest={ex.restSeconds > 0 ? () => startTimer(ex.restSeconds) : undefined}
                  onRemoveSet={(setId) => removeSet.mutate(setId)}
                  onRemoveExercise={() => removeExercise.mutate(ex.id)}
                  onUpdateRestSeconds={(seconds) =>
                    updateRestSeconds.mutate({ workoutExerciseId: ex.id, restSeconds: seconds })
                  }
                  onUpdateTargetReps={(min, max) =>
                    updateTargetReps.mutate({ workoutExerciseId: ex.id, targetRepsMin: min, targetRepsMax: max })
                  }
                  onMakeSuperset={() =>
                    setPickerMode({ type: 'makeSuperset', workoutExerciseId: ex.id })
                  }
                  onSwitchToAlternative={(workoutExerciseId, newExerciseId) =>
                    switchExercise.mutate({ workoutExerciseId, newExerciseId })
                  }
                />
              );
            }

            // Superset
            const group = workout.supersetGroups.find((g) => g.id === item.groupId);
            if (!group) return null;

            return (
              <SupersetCard
                key={item.groupId}
                group={group}
                exercises={item.exercises}
                isStrength={isStrength}
                previousSetsMap={previousSetsMap ?? new Map()}
                onMoveUp={!isFirst ? () => handleMoveItem(renderIndex, 'up') : undefined}
                onMoveDown={!isLast ? () => handleMoveItem(renderIndex, 'down') : undefined}
                onAddRound={() => logSupersetRound.mutate(item.groupId)}
                onSaveSet={(setId, data) => updateSet.mutate({ setId, data })}
                onRemoveSet={(setId) => removeSet.mutate(setId)}
                onRemoveExercise={(workoutExerciseId) => removeExercise.mutate(workoutExerciseId)}
                onAddExercise={() => setPickerMode({ type: 'addToSuperset', groupId: item.groupId })}
                onDisband={() => disbandSuperset.mutate(item.groupId)}
                onUpdateRestSeconds={(seconds) =>
                  updateSupersetRest.mutate({ groupId: item.groupId, restSeconds: seconds })
                }
                onUpdateTargetReps={(workoutExerciseId: string, min: number | null, max: number | null) =>
                  updateTargetReps.mutate({ workoutExerciseId, targetRepsMin: min, targetRepsMax: max })
                }
                onLogSet={(workoutExerciseId, data) => logSet.mutate({ workoutExerciseId, data })}
                onStartRest={() => startTimer(group.restSeconds)}
                seriesId={workout.seriesId}
                onSwitchToAlternative={(workoutExerciseId, newExerciseId) =>
                  switchExercise.mutate({ workoutExerciseId, newExerciseId })
                }
              />
            );
          })
        )}
        {isStrength && exercises.length > 0 && (
          <View className="mb-4 rounded-xl bg-background-50 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-foreground">Flexen</Text>
              <View className="rounded-full bg-primary/20 px-2.5 py-0.5">
                <Text className="text-xs font-bold text-primary">Finish</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setFlexenDone((d) => !d)}
              className={cn(
                'rounded-xl border py-4 items-center',
                flexenDone ? 'border-primary bg-primary/10' : 'border-dashed border-background-100'
              )}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={flexenDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={22}
                  color={flexenDone ? 'rgb(52, 211, 153)' : 'rgb(115, 115, 115)'}
                />
                <Text className={cn('text-sm font-medium', flexenDone ? 'text-primary' : 'text-foreground-muted')}>
                  {flexenDone ? 'Done!' : 'Mark as Done'}
                </Text>
              </View>
            </Pressable>
          </View>
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
            onPress={() => setPickerMode({ type: 'add' })}
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
        visible={pickerMode !== null}
        onSelect={handlePickerSelect}
        onClose={() => setPickerMode(null)}
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
