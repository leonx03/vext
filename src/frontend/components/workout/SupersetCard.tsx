/** SupersetCard - merged card for a superset group with multiple exercises logged per round. */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SetRow } from './SetRow';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import type { WorkoutExerciseFull, WorkoutSet, SupersetGroup } from '@shared/types/workout';

function parseRepRange(input: string): { min: number | null; max: number | null } {
  const trimmed = input.trim();
  if (!trimmed) return { min: null, max: null };
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) { const val = parseInt(singleMatch[1], 10); return { min: val, max: val }; }
  return { min: null, max: null };
}

function formatRepRange(min: number | null, max: number | null): string {
  if (min == null || max == null) return '';
  return min === max ? `${min}` : `${min}-${max}`;
}

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
  onUpdateTargetReps: (workoutExerciseId: string, min: number | null, max: number | null) => void;
  onLogSet: (workoutExerciseId: string, data: { weightKg?: number; reps?: number; durationSeconds?: number; distanceMeters?: number }) => void;
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
  onUpdateTargetReps,
  onLogSet,
  onStartRest,
}: SupersetCardProps) {
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [editingRest, setEditingRest] = useState(false);
  const [localRestSeconds, setLocalRestSeconds] = useState(group.restSeconds);
  const [showRepGoalDialog, setShowRepGoalDialog] = useState(false);
  const [repGoalInputs, setRepGoalInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.id, formatRepRange(ex.targetRepsMin, ex.targetRepsMax)]))
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  const hasAnyRepGoal = exercises.some((ex) => ex.targetRepsMin != null);
  const numRounds = Math.max(0, ...exercises.map((ex) => ex.sets.length));

  useEffect(() => {
    setLocalRestSeconds(group.restSeconds);
  }, [group.restSeconds]);

  useEffect(() => {
    setRepGoalInputs(
      Object.fromEntries(exercises.map((ex) => [ex.id, formatRepRange(ex.targetRepsMin, ex.targetRepsMax)]))
    );
  }, [exercises]);

  // Auto-collapse once when all rounds are fully filled in
  useEffect(() => {
    if (hasAutoCollapsed || numRounds === 0) return;
    const allDone = exercises.every((ex) =>
      ex.sets.length === numRounds &&
      ex.sets.every((s) =>
        isStrength ? s.weightKg != null && s.reps != null : s.durationSeconds != null
      )
    );
    if (allDone) {
      setIsCollapsed(true);
      setHasAutoCollapsed(true);
    }
  }, [exercises, numRounds, isStrength, hasAutoCollapsed]);

  const handleUpdateRest = (newVal: number) => {
    setLocalRestSeconds(newVal);
    onUpdateRestSeconds(newVal);
  };

  const handleSaveRepGoals = () => {
    exercises.forEach((ex) => {
      const { min, max } = parseRepRange(repGoalInputs[ex.id] ?? '');
      onUpdateTargetReps(ex.id, min, max);
    });
    setShowRepGoalDialog(false);
  };

  return (
    <View className="mb-4 rounded-xl bg-background-50 p-4">
      {/* Header */}
      <View className="flex-row flex-wrap items-center mb-3 gap-2">
        {(onMoveUp || onMoveDown) && (
          <View className="flex-row items-center gap-1">
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
        <Pressable
          onPress={() => setEditingRest(!editingRest)}
          className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
        >
          <Ionicons name="timer-outline" size={14} color="rgb(163, 163, 163)" />
          <Text className="ml-1 text-xs text-foreground-muted">
            {localRestSeconds === 0 ? 'No rest' : `${localRestSeconds}s rest`}
          </Text>
        </Pressable>
        {isStrength && (
          <Pressable
            onPress={() => setShowRepGoalDialog(true)}
            className="flex-row items-center rounded-full bg-background-100 px-3 py-1"
          >
            <Ionicons name="fitness-outline" size={14} color="rgb(163, 163, 163)" />
            <Text className="ml-1 text-xs text-foreground-muted">
              {hasAnyRepGoal ? 'Rep Goals' : 'Set rep goals'}
            </Text>
          </Pressable>
        )}
      </View>

      {!isCollapsed && editingRest && (
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

      {/* Rounds */}
      {!isCollapsed && Array.from({ length: numRounds }).map((_, roundIndex) => (
        <View key={roundIndex} className="mb-2">
          <Text className="text-sm font-bold text-foreground mb-1 ml-1">
            Round {roundIndex + 1}
          </Text>

          {exercises.map((ex) => {
            const set = ex.sets[roundIndex];
            const firstPreviousSet = previousSetsMap.get(ex.exerciseId)?.[0];

            return (
              <View key={ex.id}>
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
                  <SetRow
                    setNumber={roundIndex + 1}
                    isStrength={isStrength}
                    targetRepsMin={ex.targetRepsMin}
                    targetRepsMax={ex.targetRepsMax}
                    restSeconds={0}
                    hideSetNumber
                    onSave={(data) => onLogSet(ex.id, data)}
                  />
                )}
              </View>
            );
          })}

          {/* Start Rest + Delete Set buttons per round */}
          <View className="mt-1 flex-row gap-2">
            <Pressable
              onPress={onStartRest}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary/20 py-2"
            >
              <Ionicons name="timer-outline" size={16} color="rgb(52, 211, 153)" />
              <Text className="text-xs font-medium text-primary">
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
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2"
            >
              <Ionicons name="trash-outline" size={16} color="rgb(239, 68, 68)" />
              <Text className="text-xs font-medium text-destructive">Delete Set</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* Add Set button */}
      {!isCollapsed && (
        <Pressable
          onPress={onAddRound}
          className="mt-2 mb-3 rounded-xl border border-dashed border-background-100 py-3 items-center"
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
            <Text className="text-sm font-medium text-primary">Add Set</Text>
          </View>
        </Pressable>
      )}

      {/* Bottom actions */}
      {!isCollapsed && (
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
      )}

      <Pressable
        onPress={() => setIsCollapsed((c) => !c)}
        className="mt-3 -mx-4 -mb-4 rounded-b-xl border-t border-background-100 py-2 items-center"
      >
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color="rgb(115, 115, 115)"
        />
      </Pressable>

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

      {/* Rep goal dialog */}
      <Modal
        visible={showRepGoalDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepGoalDialog(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60"
          onPress={() => setShowRepGoalDialog(false)}
        >
          <Pressable
            className="mx-8 w-full max-w-sm rounded-2xl bg-background-50 p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-foreground mb-4">Rep Goals</Text>
            {exercises.map((ex) => (
              <View key={ex.id} className="mb-3">
                <Text className="text-xs font-medium text-foreground-muted mb-1">{ex.exerciseName}</Text>
                <TextInput
                  className="h-10 rounded-lg bg-background-100 px-3 text-sm text-foreground"
                  placeholder="e.g. 8-12"
                  placeholderTextColor="rgb(115, 115, 115)"
                  value={repGoalInputs[ex.id] ?? ''}
                  onChangeText={(v) => setRepGoalInputs((prev) => ({ ...prev, [ex.id]: v }))}
                />
              </View>
            ))}
            <View className="mt-2 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowRepGoalDialog(false)}
                className="rounded-lg border border-background-100 px-4 py-2.5"
              >
                <Text className="text-sm font-medium text-foreground-muted">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveRepGoals}
                className="rounded-lg bg-primary px-4 py-2.5"
              >
                <Text className="text-sm font-semibold text-background">Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});
