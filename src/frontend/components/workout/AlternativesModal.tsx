/** AlternativesModal - bottom sheet showing alternative exercises for a slot with switch/add/remove. */
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExercisePicker } from '@frontend/components/overlay/ExercisePicker';
import { useExerciseAlternatives, useAddExerciseAlternative, useRemoveExerciseAlternative } from '@frontend/hooks/useWorkout';
import { usePreviousSetsForExercises } from '@frontend/hooks/useHistory';
import type { Exercise } from '@shared/types/exercise';

type AlternativesModalProps = {
  onClose: () => void;
  slotId: string;
  seriesId: string | null | undefined;
  exerciseName: string;
  currentExerciseId: string;
  onSwitch: (alternativeExerciseId: string) => void;
};

export function AlternativesModal({
  onClose,
  slotId,
  seriesId,
  exerciseName,
  currentExerciseId,
  onSwitch,
}: AlternativesModalProps) {
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
