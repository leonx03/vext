/** SupersetAlternativesModal - single modal showing alternatives for all exercises in a superset. */
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExercisePicker } from '@frontend/components/overlay/ExercisePicker';
import { useExerciseAlternatives, useAddExerciseAlternative, useRemoveExerciseAlternative } from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import type { WorkoutExerciseFull } from '@shared/types/workout';
import type { Exercise } from '@shared/types/exercise';

type SupersetAlternativesModalProps = {
  onClose: () => void;
  exercises: WorkoutExerciseFull[];
  seriesId: string | null | undefined;
  onSwitch: (workoutExerciseId: string, newExerciseId: string) => void;
};

function ExerciseSection({
  exercise,
  seriesId,
  onSwitch,
}: {
  exercise: WorkoutExerciseFull;
  seriesId: string | null | undefined;
  onSwitch: (workoutExerciseId: string, newExerciseId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const { data: alternatives, isLoading } = useExerciseAlternatives(exercise.slotId);
  const addAlternative = useAddExerciseAlternative(exercise.slotId);
  const removeAlternative = useRemoveExerciseAlternative(exercise.slotId);

  const alternativeIds = alternatives?.map((a) => a.alternativeExerciseId) ?? [];
  const { data: lastSetsMap } = usePreviousSetsForExercises(alternativeIds, seriesId);

  const handleSelectAlternative = (ex: Exercise) => {
    addAlternative.mutate(ex.id);
    setShowPicker(false);
  };

  return (
    <>
      <View className="mb-3">
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          className="flex-row items-center py-2"
        >
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color="rgb(163, 163, 163)"
          />
          <Text className="ml-1.5 text-sm font-bold text-foreground flex-1">
            {exercise.exerciseName}
          </Text>
          <Text className="text-xs text-foreground-subtle">
            {alternatives?.filter((a) => a.alternativeExerciseId !== exercise.exerciseId).length ?? 0} alt
          </Text>
        </Pressable>

        {expanded && (
          <View className="ml-5">
            {isLoading ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="rgb(52, 211, 153)" />
              </View>
            ) : (
              <>
                {alternatives?.filter((alt) => alt.alternativeExerciseId !== exercise.exerciseId).length === 0 && (
                  <Text className="text-xs text-foreground-subtle py-2">No alternatives yet</Text>
                )}
                {alternatives?.filter((alt) => alt.alternativeExerciseId !== exercise.exerciseId).map((alt) => {
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
                    <View key={alt.id} className="border-b border-background-100 py-2.5">
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
                          onPress={() => onSwitch(exercise.id, alt.alternativeExerciseId)}
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
                  className="mt-2 mb-1 rounded-lg border border-dashed border-background-100 py-2 items-center flex-row justify-center gap-1"
                >
                  <Ionicons name="add" size={16} color="rgb(52, 211, 153)" />
                  <Text className="text-xs font-medium text-primary">Add Alternative</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
      <ExercisePicker
        visible={showPicker}
        onSelect={handleSelectAlternative}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

export function SupersetAlternativesModal({
  onClose,
  exercises,
  seriesId,
  onSwitch,
}: SupersetAlternativesModalProps) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} />
        <View className="rounded-t-2xl bg-background px-4 pt-4 pb-10" style={{ height: '70%' }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">Superset Alternatives</Text>
              <Text className="text-xs text-foreground-muted">{exercises.length} exercises</Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="rgb(163, 163, 163)" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {exercises.map((ex) => (
              <ExerciseSection
                key={ex.id}
                exercise={ex}
                seriesId={seriesId}
                onSwitch={onSwitch}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
