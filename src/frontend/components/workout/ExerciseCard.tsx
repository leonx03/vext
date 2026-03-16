/** ExerciseCard - displays an exercise with its sets, rest timer, rep goal, and alternative exercises. */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SetRow } from './SetRow';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { ExercisePicker } from '@frontend/components/overlay/ExercisePicker';
import { useExerciseAlternatives, useAddExerciseAlternative, useRemoveExerciseAlternative } from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import type { WorkoutExerciseFull, WorkoutSet } from '@shared/types/workout';
import type { Exercise } from '@shared/types/exercise';

function parseRepRange(input: string): { min: number | null; max: number | null } {
  const trimmed = input.trim();
  if (!trimmed) return { min: null, max: null };
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { min: val, max: val };
  }
  return { min: null, max: null };
}

function formatRepRange(min: number | null, max: number | null): string {
  if (min == null || max == null) return '';
  if (min === max) return `${min}`;
  return `${min}-${max}`;
}

type ExerciseCardProps = {
  exercise: WorkoutExerciseFull;
  isStrength: boolean;
  seriesId?: string | null;
  previousSets?: WorkoutSet[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddSet: () => void;
  onSaveSet: (setId: string, data: { weightKg?: number; reps?: number; durationSeconds?: number; distanceMeters?: number }) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onUpdateRestSeconds: (seconds: number) => void;
  onUpdateTargetReps: (min: number | null, max: number | null) => void;
  onStartRest?: () => void;
  onMakeSuperset?: () => void;
  onSwitchToAlternative?: (workoutExerciseId: string, newExerciseId: string) => void;
};

function AlternativesModal({
  onClose,
  slotId,
  seriesId,
  exerciseName,
  currentExerciseId,
  onSwitch,
}: {
  onClose: () => void;
  slotId: string;
  seriesId: string | null | undefined;
  exerciseName: string;
  currentExerciseId: string;
  onSwitch: (alternativeExerciseId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const { data: alternatives, isLoading } = useExerciseAlternatives(slotId);
  const addAlternative = useAddExerciseAlternative(slotId);
  const removeAlternative = useRemoveExerciseAlternative(slotId);

  const alternativeIds = alternatives?.map((a) => a.alternativeExerciseId) ?? [];
  const { data: lastSetsMap } = usePreviousSetsForExercises(alternativeIds, seriesId);

  const handleSelectAlternative = (exercise: Exercise) => {
    addAlternative.mutate(exercise.id);
    setShowPicker(false);
  };

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} />
          <View className="rounded-t-2xl bg-background px-4 pt-4 pb-10" style={{ height: '65%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">Alternatives</Text>
                <Text className="text-xs text-foreground-muted">{exerciseName}</Text>
              </View>
              <Pressable onPress={onClose} className="p-1">
                <Ionicons name="close" size={22} color="rgb(163, 163, 163)" />
              </Pressable>
            </View>

            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="rgb(52, 211, 153)" />
              </View>
            ) : (
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {alternatives?.length === 0 && (
                  <View className="py-6 items-center">
                    <Text className="text-sm text-foreground-muted">No alternatives set yet</Text>
                    <Text className="text-xs text-foreground-subtle mt-1">Tap + to add an alternative exercise</Text>
                  </View>
                )}
                {alternatives?.filter((alt) => alt.alternativeExerciseId !== currentExerciseId).map((alt) => {
                  const lastSets = lastSetsMap?.get(alt.alternativeExerciseId);
                  const firstSet = lastSets?.[0];
                  const lastDone = firstSet
                    ? firstSet.weightKg != null && firstSet.reps != null
                      ? `Last: ${firstSet.weightKg} kg × ${firstSet.reps} reps`
                      : firstSet.durationSeconds != null
                        ? `Last: ${firstSet.durationSeconds}s`
                        : null
                    : null;

                  return (
                    <View key={alt.id} className="border-b border-background-100 py-3">
                      <View className="flex-row items-center">
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-foreground">{alt.alternativeName}</Text>
                          {lastDone ? (
                            <Text className="text-xs text-primary mt-0.5">{lastDone}</Text>
                          ) : (
                            <Text className="text-xs text-foreground-subtle mt-0.5">Never done in this series</Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => { onSwitch(alt.alternativeExerciseId); onClose(); }}
                          className="rounded-lg bg-primary/15 px-3 py-1.5 mr-2"
                        >
                          <Text className="text-xs font-semibold text-primary">Switch</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeAlternative.mutate(alt.id)}
                          className="p-1"
                        >
                          <Ionicons name="close-circle-outline" size={18} color="rgb(163, 163, 163)" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Pressable
                  onPress={() => setShowPicker(true)}
                  className="mt-3 rounded-xl border border-dashed border-background-100 py-3 items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
                  <Text className="text-sm font-medium text-primary">Add Alternative</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <ExercisePicker
        visible={showPicker}
        onSelect={handleSelectAlternative}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

export const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  isStrength,
  seriesId,
  previousSets,
  onMoveUp,
  onMoveDown,
  onAddSet,
  onSaveSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateRestSeconds,
  onUpdateTargetReps,
  onStartRest,
  onMakeSuperset,
  onSwitchToAlternative,
}: ExerciseCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [editingRepGoal, setEditingRepGoal] = useState(false);
  const [repGoalInput, setRepGoalInput] = useState(formatRepRange(exercise.targetRepsMin, exercise.targetRepsMax));
  const [localRestSeconds, setLocalRestSeconds] = useState(exercise.restSeconds);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    setLocalRestSeconds(exercise.restSeconds);
  }, [exercise.restSeconds]);

  useEffect(() => {
    setRepGoalInput(formatRepRange(exercise.targetRepsMin, exercise.targetRepsMax));
  }, [exercise.targetRepsMin, exercise.targetRepsMax]);

  // Auto-collapse once when all sets are done; never re-triggers after manual expand
  useEffect(() => {
    if (hasAutoCollapsed || exercise.sets.length === 0) return;
    const allDone = isStrength
      ? exercise.sets.every((s) => s.weightKg != null && s.reps != null)
      : exercise.sets.every((s) => s.durationSeconds != null);
    if (allDone) {
      setIsCollapsed(true);
      setHasAutoCollapsed(true);
    }
  }, [exercise.sets, isStrength, hasAutoCollapsed]);

  const handleUpdateRest = (newVal: number) => {
    setLocalRestSeconds(newVal);
    onUpdateRestSeconds(newVal);
  };

  const handleSaveRepGoal = () => {
    const { min, max } = parseRepRange(repGoalInput);
    onUpdateTargetReps(min, max);
    setEditingRepGoal(false);
  };

  return (
    <>
      <View className="mb-4 rounded-xl bg-background-50 overflow-hidden flex-row">
        {/* Main content */}
        <View className="flex-1">
          <View className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 gap-2">
                {(onMoveUp || onMoveDown) && (
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={onMoveUp} disabled={!onMoveUp} className="p-1.5">
                      <Ionicons name="chevron-up" size={18} color={onMoveUp ? 'rgb(163, 163, 163)' : 'rgb(64, 64, 64)'} />
                    </Pressable>
                    <Pressable onPress={onMoveDown} disabled={!onMoveDown} className="p-1.5">
                      <Ionicons name="chevron-down" size={18} color={onMoveDown ? 'rgb(163, 163, 163)' : 'rgb(64, 64, 64)'} />
                    </Pressable>
                  </View>
                )}
                <Text className="text-base font-bold text-foreground flex-1">{exercise.exerciseName}</Text>
              </View>
              <Pressable onPress={() => setShowRemoveConfirm(true)} className="p-1">
                <Ionicons name="close-circle-outline" size={20} color="rgb(163, 163, 163)" />
              </Pressable>
            </View>

            {!isCollapsed && (
              <>
                {/* Badges row */}
                <View className="flex-row items-center gap-2 mb-2 flex-wrap">
                  <Pressable
                    onPress={() => setEditingRest(!editingRest)}
                    className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
                  >
                    <Ionicons name="timer-outline" size={14} color="rgb(163, 163, 163)" />
                    <Text className="ml-1 text-xs text-foreground-muted">
                      {localRestSeconds === 0 ? 'No rest' : `${localRestSeconds}s rest`}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setEditingRepGoal(!editingRepGoal)}
                    className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
                  >
                    <Ionicons name="fitness-outline" size={14} color="rgb(163, 163, 163)" />
                    <Text className="ml-1 text-xs text-foreground-muted">
                      {exercise.targetRepsMin != null && exercise.targetRepsMax != null
                        ? `Goal: ${formatRepRange(exercise.targetRepsMin, exercise.targetRepsMax)} reps`
                        : 'Rep goal'}
                    </Text>
                  </Pressable>

                  {onMakeSuperset && (
                    <Pressable
                      onPress={onMakeSuperset}
                      className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
                    >
                      <Ionicons name="layers-outline" size={14} color="rgb(163, 163, 163)" />
                      <Text className="ml-1 text-xs text-foreground-muted">Make Superset</Text>
                    </Pressable>
                  )}
                </View>

                {/* Rest time editor */}
                {editingRest && (
                  <View className="flex-row items-center gap-2 mb-2">
                    <Pressable
                      onPress={() => handleUpdateRest(Math.max(0, localRestSeconds - 15))}
                      className="rounded-lg bg-background-100 px-3 py-1.5"
                    >
                      <Text className="text-sm text-foreground-muted">-15s</Text>
                    </Pressable>
                    <Text className="text-sm font-medium text-foreground min-w-[48px] text-center">
                      {localRestSeconds}s
                    </Text>
                    <Pressable
                      onPress={() => handleUpdateRest(localRestSeconds + 15)}
                      className="rounded-lg bg-background-100 px-3 py-1.5"
                    >
                      <Text className="text-sm text-foreground-muted">+15s</Text>
                    </Pressable>
                  </View>
                )}

                {/* Rep goal editor */}
                {editingRepGoal && (
                  <View className="flex-row items-center gap-2 mb-2">
                    <TextInput
                      className="w-24 rounded-lg bg-background-100 px-3 py-2 text-center text-sm text-foreground"
                      placeholder="8-12"
                      placeholderTextColor="rgb(115, 115, 115)"
                      keyboardType="number-pad"
                      value={repGoalInput}
                      onChangeText={setRepGoalInput}
                      onSubmitEditing={handleSaveRepGoal}
                    />
                    <Pressable onPress={handleSaveRepGoal} className="rounded-lg bg-primary px-3 py-1.5">
                      <Text className="text-sm font-medium text-background">Save</Text>
                    </Pressable>
                    {exercise.targetRepsMin != null && (
                      <Pressable
                        onPress={() => {
                          onUpdateTargetReps(null, null);
                          setRepGoalInput('');
                          setEditingRepGoal(false);
                        }}
                        className="rounded-lg bg-background-100 px-3 py-1.5"
                      >
                        <Text className="text-xs text-foreground-muted">Clear</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Header row */}
                <View className="flex-row items-center py-1 gap-2 mb-1">
                  <View className="w-8" />
                  {isStrength ? (
                    <>
                      <Text className="flex-1 text-center text-xs text-foreground-subtle">Weight</Text>
                      <Text className="text-xs text-foreground-subtle" />
                      <Text className="flex-1 text-center text-xs text-foreground-subtle">Reps</Text>
                    </>
                  ) : (
                    <>
                      <Text className="flex-1 text-center text-xs text-foreground-subtle">Duration</Text>
                      <Text className="flex-1 text-center text-xs text-foreground-subtle">Distance</Text>
                    </>
                  )}
                  <View className="w-10" />
                  <View className="w-8" />
                </View>

                {/* Existing sets */}
                {exercise.sets.map((set, index) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    previousSet={previousSets?.[index]}
                    setNumber={set.setNumber}
                    isStrength={isStrength}
                    targetRepsMin={exercise.targetRepsMin}
                    targetRepsMax={exercise.targetRepsMax}
                    restSeconds={exercise.restSeconds}
                    onSave={(data) => onSaveSet(set.id, data)}
                    onStartRest={onStartRest}
                    onRemove={() => onRemoveSet(set.id)}
                  />
                ))}

                {/* Add Set button */}
                <Pressable
                  onPress={onAddSet}
                  className="mt-2 rounded-xl border border-dashed border-background-100 py-3 items-center"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
                    <Text className="text-sm font-medium text-primary">Add Set</Text>
                  </View>
                </Pressable>
              </>
            )}
          </View>

          {/* Collapse toggle */}
          <Pressable
            onPress={() => setIsCollapsed((c) => !c)}
            className="border-t border-background-100 py-2 items-center"
          >
            <Ionicons
              name={isCollapsed ? 'chevron-down' : 'chevron-up'}
              size={16}
              color="rgb(115, 115, 115)"
            />
          </Pressable>
        </View>

        {/* Alternatives side bar */}
        {seriesId && (
          <Pressable
            onPress={() => setShowAlternatives(true)}
            className="w-10 items-center justify-center border-l border-background-100 bg-background-100/30"
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="rgb(115, 115, 115)" />
          </Pressable>
        )}
      </View>

      <ConfirmDialog
        visible={showRemoveConfirm}
        title="Remove Exercise"
        message={`Remove ${exercise.exerciseName} and all its sets?`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          onRemoveExercise();
          setShowRemoveConfirm(false);
        }}
        onCancel={() => setShowRemoveConfirm(false)}
      />

      {showAlternatives && (
        <AlternativesModal
          onClose={() => setShowAlternatives(false)}
          slotId={exercise.slotId}
          seriesId={seriesId}
          exerciseName={exercise.exerciseName}
          currentExerciseId={exercise.exerciseId}
          onSwitch={(altId) => onSwitchToAlternative?.(exercise.id, altId)}
        />
      )}
    </>
  );
});
