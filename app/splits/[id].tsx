/** Split detail/editor - edit name, reorder/add/remove days, preview templates, apply & clear cycles. */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useSplitFull,
  useAllSeries,
  useSeriesTemplate,
  useUpdateSplit,
  useDeleteSplit,
  useAddSplitDay,
  useUpdateSplitDay,
  useRemoveSplitDay,
  useReorderSplitDays,
  useApplySplit,
  useClearAppliedSplit,
} from '@frontend/hooks/useSplits';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { DatePicker } from '@frontend/components/DatePicker';
import { formatRestShort, formatPrescription, formatPlainDate } from '@shared/utils/formatting';
import { cn } from '@frontend/lib/utils';
import type { SplitDayFull } from '@shared/types/split';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Expanded preview of a workout day's series template (exercises, prescription, notes, alternatives). */
function DayTemplate({ seriesId, seriesName }: { seriesId: string; seriesName: string }) {
  const { data: template, isLoading } = useSeriesTemplate(seriesId, seriesName);
  if (isLoading) {
    return <View className="py-3 items-center"><ActivityIndicator color="rgb(52, 211, 153)" /></View>;
  }
  if (!template || template.exercises.length === 0) {
    return <Text className="px-3 pb-3 text-xs text-foreground-subtle">No exercises in this template yet.</Text>;
  }
  return (
    <View className="px-3 pb-3 gap-2">
      {template.exercises.map((ex) => (
        <View key={ex.slotId} className="rounded-lg bg-background p-3">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm font-semibold text-foreground">{ex.exerciseName}</Text>
            <Text className="text-xs font-medium text-primary">
              {formatPrescription(ex.targetSets, ex.targetRepsMin, ex.targetRepsMax, ex.repGoalType, ex.trackingType)}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-foreground-subtle">Rest {formatRestShort(ex.restSeconds)}</Text>
          {ex.note ? <Text className="mt-1 text-xs text-foreground-muted">{ex.note}</Text> : null}
          {ex.alternatives.length > 0 ? (
            <Text className="mt-1 text-xs text-foreground-subtle">
              Alt: {ex.alternatives.map((a) => a.exerciseName).join(', ')}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function SplitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: split, isLoading } = useSplitFull(id ?? null);
  const { data: allSeries } = useAllSeries();
  const updateSplit = useUpdateSplit();
  const deleteSplit = useDeleteSplit();
  const addDay = useAddSplitDay();
  const updateDay = useUpdateSplitDay();
  const removeDay = useRemoveSplitDay();
  const reorderDays = useReorderSplitDays();
  const applySplit = useApplySplit();
  const clearApplied = useClearAppliedSplit();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [seriesPicker, setSeriesPicker] = useState<{ mode: 'add' } | { mode: 'edit'; dayId: string } | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [startDate, setStartDate] = useState(todayKey());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cycles, setCycles] = useState(4);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="rgb(52, 211, 153)" />
      </View>
    );
  }
  if (!split) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-foreground-muted">Split not found</Text>
      </View>
    );
  }

  const days = split.days;

  const toggleExpand = (dayId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= days.length) return;
    const ordered = days.map((d) => d.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    reorderDays.mutate({ splitId: split.id, orderedIds: ordered });
  };

  const handlePickSeries = (seriesId: string) => {
    if (!seriesPicker) return;
    if (seriesPicker.mode === 'add') {
      addDay.mutate({ splitId: split.id, dayType: 'workout', seriesId });
    } else {
      updateDay.mutate({ splitId: split.id, dayId: seriesPicker.dayId, dayType: 'workout', seriesId });
    }
    setSeriesPicker(null);
  };

  const handleApply = async () => {
    const res = await applySplit.mutateAsync({ splitId: split.id, startDate, cycles });
    setApplyResult(`Scheduled ${res.scheduledCount} workout${res.scheduledCount === 1 ? '' : 's'}.`);
  };

  const handleClear = async () => {
    const count = await clearApplied.mutateAsync({ splitId: split.id });
    setConfirmClear(false);
    setClearResult(`Removed ${count} planned workout${count === 1 ? '' : 's'}.`);
  };

  const dayLabel = (d: SplitDayFull) =>
    d.label || (d.dayType === 'rest' ? 'Rest' : d.seriesName || 'Pick a workout');

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Pressable onPress={() => router.back()} className="p-1">
            <Ionicons name="chevron-back" size={24} color="rgb(163, 163, 163)" />
          </Pressable>
          {isEditingName ? (
            <View className="flex-1 flex-row items-center gap-2">
              <TextInput
                autoFocus
                value={nameValue}
                onChangeText={setNameValue}
                className="flex-1 text-xl font-bold text-foreground border border-background-100 rounded-lg px-2 py-1"
              />
              <Pressable
                onPress={() => {
                  const n = nameValue.trim();
                  if (n) updateSplit.mutate({ id: split.id, name: n });
                  setIsEditingName(false);
                }}
                className="p-1"
              >
                <Ionicons name="checkmark-outline" size={20} color="rgb(52, 211, 153)" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="flex-1"
              onPress={() => { setNameValue(split.name); setIsEditingName(true); }}
            >
              <Text className="text-xl font-bold text-foreground" numberOfLines={1}>{split.name}</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setConfirmDelete(true)} className="p-2">
          <Ionicons name="trash-outline" size={20} color="rgb(239, 68, 68)" />
        </Pressable>
      </View>

      {split.description ? (
        <Text className="px-4 pb-2 text-xs text-foreground-muted">{split.description}</Text>
      ) : null}

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-[120px]">
        {/* Days */}
        {days.map((d, index) => {
          const isWorkout = d.dayType === 'workout';
          const isExpanded = expanded.has(d.id);
          return (
            <View key={d.id} className="mb-2 rounded-xl bg-background-50 overflow-hidden">
              <View className="flex-row items-center p-3">
                <View className="mr-2 flex-col gap-1">
                  <Pressable onPress={() => move(index, -1)} disabled={index === 0} className="p-1 rounded bg-background-100">
                    <Ionicons name="chevron-up" size={14} color={index === 0 ? 'rgb(64,64,64)' : 'rgb(163,163,163)'} />
                  </Pressable>
                  <Pressable onPress={() => move(index, 1)} disabled={index === days.length - 1} className="p-1 rounded bg-background-100">
                    <Ionicons name="chevron-down" size={14} color={index === days.length - 1 ? 'rgb(64,64,64)' : 'rgb(163,163,163)'} />
                  </Pressable>
                </View>

                <View className="mr-3 w-7 h-7 rounded-full bg-background-100 items-center justify-center">
                  <Text className="text-xs font-bold text-foreground-subtle">{index + 1}</Text>
                </View>

                <Pressable
                  className="flex-1"
                  onPress={() => isWorkout && d.seriesId ? toggleExpand(d.id) : (isWorkout ? setSeriesPicker({ mode: 'edit', dayId: d.id }) : undefined)}
                >
                  <Text className={cn('text-base font-semibold', isWorkout ? 'text-foreground' : 'text-foreground-muted')}>
                    {dayLabel(d)}
                  </Text>
                  <Text className="text-xs text-foreground-subtle">{isWorkout ? 'Workout' : 'Rest day'}</Text>
                </Pressable>

                {isWorkout && (
                  <Pressable onPress={() => setSeriesPicker({ mode: 'edit', dayId: d.id })} className="p-2">
                    <Ionicons name="swap-horizontal-outline" size={18} color="rgb(115, 115, 115)" />
                  </Pressable>
                )}
                {isWorkout && d.seriesId && (
                  <Pressable onPress={() => toggleExpand(d.id)} className="p-2">
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgb(115, 115, 115)" />
                  </Pressable>
                )}
                <Pressable onPress={() => removeDay.mutate({ splitId: split.id, dayId: d.id })} className="p-2">
                  <Ionicons name="close" size={18} color="rgb(115, 115, 115)" />
                </Pressable>
              </View>

              {isWorkout && d.seriesId && isExpanded && (
                <DayTemplate seriesId={d.seriesId} seriesName={d.seriesName ?? ''} />
              )}
            </View>
          );
        })}

        {/* Add day buttons */}
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={() => setSeriesPicker({ mode: 'add' })}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-background-100 py-3"
          >
            <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
            <Text className="text-sm font-medium text-primary">Workout day</Text>
          </Pressable>
          <Pressable
            onPress={() => addDay.mutate({ splitId: split.id, dayType: 'rest' })}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-background-100 py-3"
          >
            <Ionicons name="moon-outline" size={16} color="rgb(163, 163, 163)" />
            <Text className="text-sm font-medium text-foreground-muted">Rest day</Text>
          </Pressable>
        </View>

        {/* Apply / clear */}
        <View className="mt-6 gap-2">
          <Pressable
            onPress={() => { setApplyResult(null); setShowApply(true); }}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          >
            <Ionicons name="calendar-outline" size={18} color="rgb(10, 10, 10)" />
            <Text className="text-sm font-semibold text-background">Apply to Agenda</Text>
          </Pressable>
          <Pressable
            onPress={() => { setClearResult(null); setConfirmClear(true); }}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-background-100 py-3"
          >
            <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
            <Text className="text-sm font-medium text-foreground-muted">Clear planned workouts</Text>
          </Pressable>
          {clearResult ? <Text className="text-center text-xs text-foreground-muted">{clearResult}</Text> : null}
        </View>
      </ScrollView>

      {/* Series picker modal */}
      <Modal visible={!!seriesPicker} transparent animationType="slide" onRequestClose={() => setSeriesPicker(null)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/60" onPress={() => setSeriesPicker(null)} />
          <View className="rounded-t-2xl bg-background px-4 pt-4 pb-10" style={{ height: '60%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-foreground">Choose a workout</Text>
              <Pressable onPress={() => setSeriesPicker(null)} className="p-1">
                <Ionicons name="close" size={22} color="rgb(163, 163, 163)" />
              </Pressable>
            </View>
            {(!allSeries || allSeries.length === 0) ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-sm text-foreground-muted">No workouts yet</Text>
                <Text className="mt-1 text-xs text-foreground-subtle">Complete a workout to create one</Text>
              </View>
            ) : (
              <FlatList
                data={allSeries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handlePickSeries(item.id)}
                    className="flex-row items-center justify-between py-3 border-b border-background-100"
                  >
                    <Text className="text-sm font-medium text-foreground">{item.name}</Text>
                    <Ionicons name="add-circle-outline" size={20} color="rgb(52, 211, 153)" />
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Apply modal */}
      <Modal visible={showApply} transparent animationType="fade" onRequestClose={() => setShowApply(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={() => setShowApply(false)}>
          <Pressable className="mx-8 w-full max-w-sm rounded-2xl bg-background-50 p-6" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-foreground">Apply Split</Text>
            <Text className="mt-1 text-xs text-foreground-muted">Schedules each workout day onto the agenda. Rest days are skipped.</Text>

            <Text className="mt-4 text-xs font-medium text-foreground-subtle">START DATE</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="mt-1 flex-row items-center justify-between rounded-lg border border-background-100 px-3 py-2.5"
            >
              <Text className="text-foreground">{formatPlainDate(startDate)}</Text>
              <Ionicons name="calendar-outline" size={18} color="rgb(115, 115, 115)" />
            </Pressable>

            <Text className="mt-4 text-xs font-medium text-foreground-subtle">CYCLES</Text>
            <View className="mt-1 flex-row items-center gap-4">
              <Pressable onPress={() => setCycles((c) => Math.max(1, c - 1))} className="w-10 h-10 rounded-lg bg-background-100 items-center justify-center">
                <Ionicons name="remove" size={20} color="rgb(163, 163, 163)" />
              </Pressable>
              <Text className="text-lg font-bold text-foreground w-8 text-center">{cycles}</Text>
              <Pressable onPress={() => setCycles((c) => Math.min(52, c + 1))} className="w-10 h-10 rounded-lg bg-background-100 items-center justify-center">
                <Ionicons name="add" size={20} color="rgb(52, 211, 153)" />
              </Pressable>
            </View>

            {applyResult ? (
              <Text className="mt-4 text-sm text-primary">{applyResult}</Text>
            ) : null}
            {applySplit.error ? (
              <Text className="mt-2 text-xs text-destructive">{applySplit.error.message}</Text>
            ) : null}

            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable onPress={() => setShowApply(false)} className="rounded-lg border border-background-100 px-4 py-2.5">
                <Text className="text-sm font-medium text-foreground-muted">{applyResult ? 'Done' : 'Cancel'}</Text>
              </Pressable>
              {!applyResult && (
                <Pressable onPress={handleApply} disabled={applySplit.isPending} className="rounded-lg bg-primary px-4 py-2.5">
                  <Text className="text-sm font-semibold text-background">Apply</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete Split"
        message={`Delete "${split.name}"? Planned (not-yet-started) workouts from it are also removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { await deleteSplit.mutateAsync(split.id); setConfirmDelete(false); router.back(); }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        visible={confirmClear}
        title="Clear Planned Workouts"
        message="Remove this split's planned workouts from the agenda? Workouts you've already started are kept."
        confirmLabel="Clear"
        destructive
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />

      <DatePicker
        visible={showDatePicker}
        value={startDate}
        onSelect={(date) => { setStartDate(date); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}
