/** SupersetCard - merged card for a superset group with multiple exercises logged per round. */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SetRow } from './SetRow';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import type { WorkoutExerciseFull, WorkoutSet, SupersetGroup } from '@shared/types/workout';

type SupersetCardProps = {
  group: SupersetGroup;
  exercises: WorkoutExerciseFull[];
  isStrength: boolean;
  previousSetsMap: Map<string, WorkoutSet[]>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddRound: () => void;
  onSaveSet: (setId: string, data: { weightKg?: number; reps?: number; durationSeconds?: number; distanceMeters?: number }) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: (workoutExerciseId: string) => void;
  onAddExercise: () => void;
  onDisband: () => void;
  onUpdateRestSeconds: (seconds: number) => void;
  onStartRest: () => void;
};

export const SupersetCard = React.memo(function SupersetCard({
  group,
  exercises,
  isStrength,
  previousSetsMap,
  onMoveUp,
  onMoveDown,
  onAddRound,
  onSaveSet,
  onRemoveSet,
  onRemoveExercise,
  onAddExercise,
  onDisband,
  onUpdateRestSeconds,
  onStartRest,
}: SupersetCardProps) {
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [localRestSeconds, setLocalRestSeconds] = useState(group.restSeconds);

  useEffect(() => {
    setLocalRestSeconds(group.restSeconds);
  }, [group.restSeconds]);

  const handleUpdateRest = (newVal: number) => {
    setLocalRestSeconds(newVal);
    onUpdateRestSeconds(newVal);
  };

  const numRounds = Math.max(0, ...exercises.map((ex) => ex.sets.length));

  return (
    <View className="mb-4 rounded-xl bg-background-50 p-4">
      {/* Header */}
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
          <View className="rounded-full bg-primary/20 px-2.5 py-0.5">
            <Text className="text-xs font-bold text-primary">Superset</Text>
          </View>
        </View>
      </View>

      {/* Badges row */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => setEditingRest(!editingRest)}
          className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
        >
          <Ionicons name="timer-outline" size={14} color="rgb(163, 163, 163)" />
          <Text className="ml-1 text-xs text-foreground-muted">
            {localRestSeconds === 0 ? 'No rest' : `${localRestSeconds}s rest`}
          </Text>
        </Pressable>
      </View>

      {/* Rest editor */}
      {editingRest && (
        <View className="flex-row items-center gap-2 mb-3">
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

      {/* Global column header */}
      {numRounds > 0 && (
        <View className="flex-row items-center py-1 gap-2 mb-1">
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
        </View>
      )}

      {/* Rounds */}
      {Array.from({ length: numRounds }).map((_, roundIndex) => (
        <View key={roundIndex} className="mb-2">
          <Text className="text-xs font-semibold text-foreground-subtle mb-1 ml-1">
            Round {roundIndex + 1}
          </Text>

          {exercises.map((ex) => {
            const set = ex.sets[roundIndex];
            const firstPreviousSet = previousSetsMap.get(ex.exerciseId)?.[0];

            return (
              <View key={ex.id}>
                {/* Exercise label + last time inline with dash */}
                <Text className="text-xs font-medium text-foreground-muted mb-0.5">
                  {ex.exerciseName}
                  {firstPreviousSet ? (
                    <Text className="text-foreground-subtle">
                      {isStrength
                        ? ` - last: ${firstPreviousSet.weightKg ?? 0}kg × ${firstPreviousSet.reps ?? 0}`
                        : ` - last: ${firstPreviousSet.durationSeconds ?? 0}s${firstPreviousSet.distanceMeters != null ? ` · ${firstPreviousSet.distanceMeters}m` : ''}`}
                    </Text>
                  ) : null}
                </Text>

                {set ? (
                  <SetRow
                    set={set}
                    setNumber={set.setNumber}
                    isStrength={isStrength}
                    targetRepsMin={ex.targetRepsMin}
                    targetRepsMax={ex.targetRepsMax}
                    restSeconds={0}
                    hideSetNumber
                    onSave={(data) => onSaveSet(set.id, data)}
                  />
                ) : (
                  <View className="h-10" />
                )}
              </View>
            );
          })}

          {/* Start Rest + Delete Set buttons per round */}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              onPress={onStartRest}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-background-100 py-2"
            >
              <Ionicons name="timer-outline" size={16} color="rgb(163, 163, 163)" />
              <Text className="text-xs text-foreground-muted">
                Start Rest ({localRestSeconds}s)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                exercises.forEach((ex) => {
                  const s = ex.sets[roundIndex];
                  if (s) onRemoveSet(s.id);
                });
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-background-100 py-2"
            >
              <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
              <Text className="text-xs text-foreground-muted">Delete Set</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* Add Set button */}
      <Pressable
        onPress={onAddRound}
        className="mt-2 mb-3 rounded-xl border border-dashed border-background-100 py-3 items-center"
      >
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
          <Text className="text-sm font-medium text-primary">Add Set</Text>
        </View>
      </Pressable>

      {/* Bottom actions */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onAddExercise}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-background-100 py-2"
        >
          <Ionicons name="add-circle-outline" size={16} color="rgb(163, 163, 163)" />
          <Text className="text-xs text-foreground-muted">Add Exercise</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowDisbandConfirm(true)}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-background-100 py-2"
        >
          <Ionicons name="git-branch-outline" size={16} color="rgb(163, 163, 163)" />
          <Text className="text-xs text-foreground-muted">Ungroup</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={showDisbandConfirm}
        title="Ungroup Superset"
        message="Exercises will become standalone. Sets are kept."
        confirmLabel="Ungroup"
        onConfirm={() => {
          onDisband();
          setShowDisbandConfirm(false);
        }}
        onCancel={() => setShowDisbandConfirm(false)}
      />
    </View>
  );
});
