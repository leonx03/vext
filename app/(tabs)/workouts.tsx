/** Workouts screen - paginated workout history with session details and continue option. */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutCard } from '@frontend/components/workout/WorkoutCard';
import { EmptyState } from '@frontend/components/EmptyState';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { useWorkoutHistory, useWorkoutGroupDetails } from '@frontend/hooks/useHistory';
import { useRepeatWorkout, useDeleteWorkout, useDeleteWorkouts, useContinueWorkout, useForceContinueWorkout, useUpdateWorkoutName, useMoveSeriesUp, useMoveSeriesDown } from '@frontend/hooks/useWorkout';
import { useRouter } from 'expo-router';
import { formatDate, formatDuration, parseUTCTimestamp } from '@shared/utils/formatting';
import { cn } from '@frontend/lib/utils';
import type { WorkoutSummary, WorkoutGroup, WorkoutExerciseFull } from '@shared/types/workout';

type SessionRenderItem =
  | { kind: 'standalone'; ex: WorkoutExerciseFull }
  | { kind: 'superset'; groupId: string; exercises: WorkoutExerciseFull[] };

function buildSessionRenderItems(exercises: WorkoutExerciseFull[]): SessionRenderItem[] {
  const items: SessionRenderItem[] = [];
  const seenGroups = new Set<string>();
  for (const ex of exercises) {
    if (!ex.supersetGroupId) {
      items.push({ kind: 'standalone', ex });
    } else if (!seenGroups.has(ex.supersetGroupId)) {
      seenGroups.add(ex.supersetGroupId);
      items.push({
        kind: 'superset',
        groupId: ex.supersetGroupId,
        exercises: exercises.filter((e) => e.supersetGroupId === ex.supersetGroupId),
      });
    }
  }
  return items;
}

/** Strip "(#N)" suffix to get the base workout name for grouping. */
function getBaseName(name: string | null, typeName: string): string {
  if (!name) return typeName;
  return name.replace(/\s*\(#\d+\)$/, '');
}

function groupWorkouts(workouts: WorkoutSummary[]): WorkoutGroup[] {
  const map = new Map<string, WorkoutGroup>();
  for (const w of workouts) {
    const baseName = getBaseName(w.name, w.workoutTypeName);
    const key = `${w.workoutTypeName}::${baseName}`;
    const existing = map.get(key);
    if (existing) {
      existing.sessions.push(w);
    } else {
      map.set(key, {
        key,
        seriesId: w.seriesId,
        displayName: baseName,
        workoutTypeName: w.workoutTypeName,
        latest: w,
        sessions: [w],
      });
    }
  }
  return Array.from(map.values());
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useWorkoutHistory();
  const repeatWorkout = useRepeatWorkout();
  const deleteWorkout = useDeleteWorkout();
  const deleteWorkouts = useDeleteWorkouts();
  const updateWorkoutName = useUpdateWorkoutName();

  const continueWorkout = useContinueWorkout();
  const forceContinueWorkout = useForceContinueWorkout();
  const moveSeriesUp = useMoveSeriesUp();
  const moveSeriesDown = useMoveSeriesDown();

  const [selectedGroup, setSelectedGroup] = useState<WorkoutGroup | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<WorkoutGroup | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [confirmContinueId, setConfirmContinueId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const selectedIds = useMemo(
    () => selectedGroup?.sessions.map((s) => s.id) ?? [],
    [selectedGroup]
  );
  const { data: groupDetails } = useWorkoutGroupDetails(selectedIds);

  const workouts = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data]
  );

  const groups = useMemo(() => groupWorkouts(workouts), [workouts]);

  // Keep selectedGroup in sync with live data after mutations (delete, rename, etc.)
  useEffect(() => {
    if (!selectedGroup) return;
    const fresh = groups.find((g) => g.key === selectedGroup.key);
    if (!fresh) {
      setSelectedGroup(null);
    } else if (
      fresh.latest.id !== selectedGroup.latest.id ||
      fresh.sessions.length !== selectedGroup.sessions.length
    ) {
      setSelectedGroup(fresh);
    }
  }, [groups]);

  // Reset editing state when selected group changes
  useEffect(() => {
    setIsEditingName(false);
    setExpandedSessions(new Set());
  }, [selectedGroup]);

  const handleRepeat = async (workoutId: string) => {
    try {
      const newWorkout = await repeatWorkout.mutateAsync(workoutId);
      router.replace(`/workout/${newWorkout.id}`);
    } catch (e) {
      // mutation errors shown inline via repeatWorkout.error
      if (__DEV__) console.warn('Repeat workout failed:', e);
    }
  };

  const handleDeleteGroup = async (group: WorkoutGroup) => {
    const ids = group.sessions.map((s) => s.id);
    await deleteWorkouts.mutateAsync(ids);
    setConfirmDeleteGroup(null);
    setSelectedGroup(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteWorkout.mutateAsync(sessionId);
    setConfirmDeleteSessionId(null);
    // If we deleted the last session in the group, close the modal
    if (selectedGroup && selectedGroup.sessions.length <= 1) {
      setSelectedGroup(null);
    }
  };

  const handleContinue = async (workoutId: string) => {
    const result = await continueWorkout.mutateAsync(workoutId);
    if (result.success) {
      setSelectedGroup(null);
      router.replace(`/workout/${workoutId}`);
    } else {
      setConfirmContinueId(workoutId);
    }
  };

  const handleForceContinue = async () => {
    if (!confirmContinueId) return;
    await forceContinueWorkout.mutateAsync(confirmContinueId);
    setConfirmContinueId(null);
    setSelectedGroup(null);
    router.replace(`/workout/${confirmContinueId}`);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-foreground">Workouts</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.key}
        className="flex-1 px-4"
        contentContainerClassName={cn(groups.length === 0 ? 'flex-1' : 'pb-[100px]')}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="rgb(52, 211, 153)" />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : (
            <EmptyState
              icon="fitness-outline"
              title="No workouts yet"
              message="Complete your first workout to see it here"
              actionLabel="Start Workout"
              onAction={() => router.push('/workout/new')}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View className="flex-row items-center">
            <View className="flex-1">
              <WorkoutCard
                workout={item.latest}
                sessionCount={item.sessions.length}
                onPress={() => setSelectedGroup(item)}
                onRepeat={() => handleRepeat(item.latest.id)}
                onDelete={() => setConfirmDeleteGroup(item)}
                onEdit={(name) => updateWorkoutName.mutate({ workoutId: item.latest.id, name })}
              />
            </View>
            <View className="ml-1.5 flex-col justify-center gap-1">
              <Pressable
                onPress={() => item.seriesId && moveSeriesUp.mutate(item.seriesId)}
                disabled={index === 0}
                className="p-2 rounded-lg bg-background-50"
              >
                <Ionicons name="chevron-up" size={16} color={index === 0 ? 'rgb(64, 64, 64)' : 'rgb(163, 163, 163)'} />
              </Pressable>
              <Pressable
                onPress={() => item.seriesId && moveSeriesDown.mutate(item.seriesId)}
                disabled={index === groups.length - 1}
                className="p-2 rounded-lg bg-background-50"
              >
                <Ionicons name="chevron-down" size={16} color={index === groups.length - 1 ? 'rgb(64, 64, 64)' : 'rgb(163, 163, 163)'} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Group detail modal */}
      <Modal visible={!!selectedGroup} transparent animationType="slide" onRequestClose={() => setSelectedGroup(null)}>
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/60"
            onPress={() => setSelectedGroup(null)}
          />
          <View className="h-3/4 rounded-t-2xl bg-background">
            <View className="border-b border-background-100 px-4 pt-3 pb-3">
              {/* Row 1: title + close */}
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  {isEditingName ? (
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        autoFocus
                        className="flex-1 text-lg font-bold text-foreground border border-background-100 rounded-lg px-2 py-1"
                        value={editNameValue}
                        onChangeText={setEditNameValue}
                      />
                      <Pressable
                        onPress={() => {
                          if (!selectedGroup) return;
                          const newName = editNameValue.trim() || selectedGroup.displayName;
                          updateWorkoutName.mutate({ workoutId: selectedGroup.latest.id, name: newName });
                          setIsEditingName(false);
                        }}
                        className="p-1"
                      >
                        <Ionicons name="checkmark-outline" size={16} color="rgb(52, 211, 153)" />
                      </Pressable>
                      <Pressable
                        onPress={() => setIsEditingName(false)}
                        className="p-1"
                      >
                        <Ionicons name="close-outline" size={16} color="rgb(163, 163, 163)" />
                      </Pressable>
                    </View>
                  ) : (
                    <Text className="text-lg font-bold text-foreground">{selectedGroup?.displayName}</Text>
                  )}
                  <Text className="text-xs text-foreground-subtle">
                    {selectedGroup?.workoutTypeName} · {groupDetails?.length ?? selectedGroup?.sessions.length} session{(groupDetails?.length ?? selectedGroup?.sessions.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedGroup(null)} className="p-1">
                  <Ionicons name="close" size={24} color="rgb(163, 163, 163)" />
                </Pressable>
              </View>
              {/* Row 2: action buttons */}
              <View className="flex-row gap-2">
                {selectedGroup && (
                  <Pressable
                    onPress={() => { setSelectedGroup(null); handleRepeat(selectedGroup.latest.id); }}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-background-100 py-2"
                  >
                    <Ionicons name="play-outline" size={14} color="rgb(52, 211, 153)" />
                    <Text className="text-xs font-medium text-primary">Start</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setIsEditingName(true);
                    setEditNameValue(selectedGroup?.displayName ?? '');
                  }}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-background-100 py-2"
                >
                  <Ionicons name="pencil-outline" size={14} color="rgb(163, 163, 163)" />
                  <Text className="text-xs font-medium text-foreground-muted">Edit</Text>
                </Pressable>
                {selectedGroup && (
                  <Pressable
                    onPress={() => setConfirmDeleteGroup(selectedGroup)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-background-100 py-2"
                  >
                    <Ionicons name="trash-outline" size={14} color="rgb(239, 68, 68)" />
                    <Text className="text-xs font-medium text-destructive">Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {groupDetails ? (
              <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-10">
                {groupDetails.map((session) => {
                  const duration = session.completedAt
                    ? Math.floor((parseUTCTimestamp(session.completedAt).getTime() - parseUTCTimestamp(session.startedAt).getTime()) / 1000)
                    : 0;

                  const renderItems = buildSessionRenderItems(session.exercises);

                  const isExpanded = expandedSessions.has(session.id);
                  const toggleExpanded = () =>
                    setExpandedSessions((prev) => {
                      const next = new Set(prev);
                      if (next.has(session.id)) next.delete(session.id);
                      else next.add(session.id);
                      return next;
                    });

                  return (
                    <View key={session.id} className="mb-4 rounded-xl bg-background-50 overflow-hidden">
                      {/* Session header */}
                      <View className="flex-row items-center justify-between p-3">
                        <View>
                          <Text className="text-sm font-semibold text-foreground">
                            {formatDate(session.startedAt)}
                          </Text>
                          <Text className="text-xs text-foreground-muted mt-0.5">{formatDuration(duration)}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Pressable
                            onPress={() => handleContinue(session.id)}
                            className="rounded-lg bg-background-100 p-1.5"
                          >
                            <Ionicons name="play-outline" size={14} color="rgb(52, 211, 153)" />
                          </Pressable>
                          <Pressable
                            onPress={() => setConfirmDeleteSessionId(session.id)}
                            className="p-1"
                          >
                            <Ionicons name="trash-outline" size={14} color="rgb(239, 68, 68)" />
                          </Pressable>
                        </View>
                      </View>

                      {/* Exercises — only when expanded */}
                      {isExpanded && (
                        <View className="px-3 pb-1">
                          {renderItems.map((item) => {
                            if (item.kind === 'standalone') {
                              const ex = item.ex;
                              return (
                                <View key={ex.id} className="mb-3 rounded-xl bg-background p-3">
                                  <Text className="text-sm font-semibold text-foreground mb-2">{ex.exerciseName}</Text>
                                  {ex.sets.map((set) => (
                                    <View key={set.id} className="flex-row items-center py-1 gap-3">
                                      <View className="w-6 h-6 rounded-full bg-background-100 items-center justify-center">
                                        <Text className="text-[10px] font-bold text-foreground-subtle">{set.setNumber}</Text>
                                      </View>
                                      <Text className="text-sm text-foreground-muted">
                                        {set.weightKg != null && set.reps != null
                                          ? `${set.weightKg} kg × ${set.reps} reps`
                                          : set.durationSeconds != null
                                            ? `${set.durationSeconds}s${set.distanceMeters != null ? ` · ${set.distanceMeters}m` : ''}`
                                            : '—'}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              );
                            }

                            // Superset
                            const { groupId, exercises: groupExs } = item;
                            const numRounds = Math.max(0, ...groupExs.map((e) => e.sets.length));
                            return (
                              <View key={groupId} className="mb-3 rounded-xl bg-background p-3">
                                <View className="flex-row items-center gap-2 mb-2">
                                  <View className="rounded-full bg-primary/20 px-2.5 py-0.5">
                                    <Text className="text-xs font-bold text-primary">Superset</Text>
                                  </View>
                                </View>
                                {Array.from({ length: numRounds }).map((_, roundIndex) => (
                                  <View key={roundIndex} className="mb-2">
                                    <Text className="text-xs font-bold text-foreground mb-1">Round {roundIndex + 1}</Text>
                                    <View className="flex-row ml-1 gap-3">
                                      <View>
                                        {groupExs.map((ge) => (
                                          <Text key={ge.id} className="text-xs font-medium text-foreground-muted py-0.5">
                                            {ge.exerciseName}
                                          </Text>
                                        ))}
                                      </View>
                                      <View>
                                        {groupExs.map((ge) => {
                                          const set = ge.sets[roundIndex];
                                          return (
                                            <Text key={ge.id} className="text-xs text-foreground-subtle py-0.5">
                                              {set && set.weightKg != null && set.reps != null
                                                ? `${set.weightKg} kg × ${set.reps}`
                                                : set && set.durationSeconds != null
                                                  ? `${set.durationSeconds}s${set.distanceMeters != null ? ` · ${set.distanceMeters}m` : ''}`
                                                  : '—'}
                                            </Text>
                                          );
                                        })}
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Full-width bottom bar toggle */}
                      <Pressable
                        onPress={toggleExpanded}
                        className="border-t border-background-100 py-2 items-center"
                      >
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="rgb(115, 115, 115)"
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="rgb(52, 211, 153)" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirm delete group */}
      <ConfirmDialog
        visible={!!confirmDeleteGroup}
        title="Delete All Sessions"
        message={`Delete all ${confirmDeleteGroup?.sessions.length} sessions of "${confirmDeleteGroup?.displayName}"? This cannot be undone.`}
        confirmLabel="Delete All"
        destructive
        onConfirm={() => confirmDeleteGroup && handleDeleteGroup(confirmDeleteGroup)}
        onCancel={() => setConfirmDeleteGroup(null)}
      />

      {/* Confirm delete single session */}
      <ConfirmDialog
        visible={!!confirmDeleteSessionId}
        title="Delete Workout"
        message="Delete this workout session? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteSessionId && handleDeleteSession(confirmDeleteSessionId)}
        onCancel={() => setConfirmDeleteSessionId(null)}
      />

      {/* Confirm discard active workout to continue */}
      <ConfirmDialog
        visible={!!confirmContinueId}
        title="Active Workout in Progress"
        message="You have an active workout. Discard it and continue this one?"
        confirmLabel="Discard & Continue"
        destructive
        onConfirm={handleForceContinue}
        onCancel={() => setConfirmContinueId(null)}
      />
    </View>
  );
}
