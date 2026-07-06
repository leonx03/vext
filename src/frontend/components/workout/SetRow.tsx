/** SetRow - editable row for a single set; which inputs show depend on the exercise's tracking mode. */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@frontend/lib/utils';
import type { WorkoutSet } from '@shared/types/workout';
import type { WorkoutSetInput } from '@backend/models/workoutSet';
import { SetInputMode, getSetLoad } from './setInputMode';

function getRepsColor(reps: number | null, min: number | null, max: number | null): string {
  if (reps == null || min == null || max == null) return 'text-foreground';
  if (reps < min) return 'text-amber-500';
  if (reps > max) return 'text-blue-400';
  return 'text-emerald-400';
}

type SetRowProps = {
  set?: WorkoutSet;
  previousSet?: WorkoutSet;
  setNumber: number;
  mode: SetInputMode;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  restSeconds?: number;
  hideSetNumber?: boolean;
  onSave: (data: WorkoutSetInput) => void;
  onStartRest?: () => void;
  onRemove?: () => void;
};

export function SetRow({ set, previousSet, setNumber, mode, targetRepsMin, targetRepsMax, restSeconds, hideSetNumber, onSave, onStartRest, onRemove }: SetRowProps) {
  const [weight, setWeight] = useState(set?.weightKg?.toString() ?? '');
  const [reps, setReps] = useState(set?.reps?.toString() ?? '');
  const [duration, setDuration] = useState(set?.durationSeconds?.toString() ?? '');
  const [distance, setDistance] = useState(set?.distanceMeters?.toString() ?? '');
  const [load, setLoad] = useState(set ? getSetLoad(set) ?? '' : '');
  const [saved, setSaved] = useState(!!set);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (set) {
      setWeight(set.weightKg?.toString() ?? '');
      setReps(set.reps?.toString() ?? '');
      setDuration(set.durationSeconds?.toString() ?? '');
      setDistance(set.distanceMeters?.toString() ?? '');
      setLoad(getSetLoad(set) ?? '');
      setSaved(true);
    }
  }, [set]);

  // Clean up the stopwatch interval on unmount.
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleSave = () => {
    if (mode === 'weighted') {
      const w = weight ? parseFloat(weight) : undefined;
      const r = reps ? parseInt(reps, 10) : undefined;
      if (w !== undefined || r !== undefined) { onSave({ weightKg: w, reps: r }); setSaved(true); }
    } else if (mode === 'bodyweight') {
      const r = reps ? parseInt(reps, 10) : undefined;
      const l = load.trim();
      if (r !== undefined || l) { onSave({ reps: r, customFields: l ? { load: l } : null }); setSaved(true); }
    } else if (mode === 'time') {
      const d = duration ? parseInt(duration, 10) : undefined;
      if (d !== undefined) { onSave({ durationSeconds: d }); setSaved(true); }
    } else {
      const d = duration ? parseInt(duration, 10) : undefined;
      const dist = distance ? parseFloat(distance) : undefined;
      if (d !== undefined || dist !== undefined) { onSave({ durationSeconds: d, distanceMeters: dist }); setSaved(true); }
    }
  };

  const toggleStopwatch = () => {
    if (running) {
      const secs = startRef.current != null
        ? Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
        : (duration ? parseInt(duration, 10) : 0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setRunning(false);
      setDuration(String(secs));
      onSave({ durationSeconds: secs });
      setSaved(true);
    } else {
      startRef.current = Date.now();
      setDuration('0');
      setSaved(false);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        if (startRef.current != null) {
          setDuration(String(Math.round((Date.now() - startRef.current) / 1000)));
        }
      }, 250);
    }
  };

  const showRestButton = (restSeconds ?? 0) > 0 && !!onStartRest;

  const lastText = (() => {
    if (!previousSet) return null;
    if (mode === 'weighted') return `Last: ${previousSet.weightKg ?? 0}kg x ${previousSet.reps ?? 0}`;
    if (mode === 'bodyweight') return `Last: ${getSetLoad(previousSet) ?? 'bw'} x ${previousSet.reps ?? 0}`;
    if (mode === 'time') return `Last: ${previousSet.durationSeconds ?? 0}s`;
    return `Last: ${previousSet.durationSeconds ?? 0}s${previousSet.distanceMeters != null ? ` · ${previousSet.distanceMeters}m` : ''}`;
  })();

  return (
    <View>
      <View className="flex-row items-center py-2 gap-2">
        {!hideSetNumber && (
          <View className="w-8 h-8 rounded-full bg-background-100 items-center justify-center">
            <Text className="text-xs font-bold text-foreground-muted">{setNumber}</Text>
          </View>
        )}

        {mode === 'weighted' && (
          <>
            <TextInput
              className="h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm text-foreground"
              placeholder="kg"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={(v) => { setWeight(v); setSaved(false); }}
              onBlur={handleSave}
            />
            <Text className="text-foreground-subtle text-xs">x</Text>
            <TextInput
              className={cn(
                'h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm',
                saved && reps ? getRepsColor(parseInt(reps, 10), targetRepsMin ?? null, targetRepsMax ?? null) : 'text-foreground'
              )}
              placeholder="reps"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="number-pad"
              value={reps}
              onChangeText={(v) => { setReps(v); setSaved(false); }}
              onBlur={handleSave}
            />
          </>
        )}

        {mode === 'bodyweight' && (
          <>
            <TextInput
              className="h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm text-foreground"
              placeholder="load"
              placeholderTextColor="rgb(115, 115, 115)"
              autoCapitalize="none"
              value={load}
              onChangeText={(v) => { setLoad(v); setSaved(false); }}
              onBlur={handleSave}
            />
            <Text className="text-foreground-subtle text-xs">x</Text>
            <TextInput
              className={cn(
                'h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm',
                saved && reps ? getRepsColor(parseInt(reps, 10), targetRepsMin ?? null, targetRepsMax ?? null) : 'text-foreground'
              )}
              placeholder="reps"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="number-pad"
              value={reps}
              onChangeText={(v) => { setReps(v); setSaved(false); }}
              onBlur={handleSave}
            />
          </>
        )}

        {mode === 'time' && (
          <>
            <TextInput
              className="h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm text-foreground"
              placeholder="sec"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="number-pad"
              value={duration}
              editable={!running}
              onChangeText={(v) => { setDuration(v); setSaved(false); }}
              onBlur={handleSave}
            />
            <Pressable
              onPress={toggleStopwatch}
              className={cn('w-10 h-10 items-center justify-center rounded-lg', running ? 'bg-destructive/20' : 'bg-background-100')}
            >
              <Ionicons name={running ? 'stop' : 'play'} size={16} color={running ? 'rgb(239, 68, 68)' : 'rgb(52, 211, 153)'} />
            </Pressable>
          </>
        )}

        {mode === 'cardio' && (
          <>
            <TextInput
              className="h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm text-foreground"
              placeholder="sec"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="number-pad"
              value={duration}
              onChangeText={(v) => { setDuration(v); setSaved(false); }}
              onBlur={handleSave}
            />
            <TextInput
              className="h-10 flex-1 rounded-lg bg-background-100 px-3 text-center text-sm text-foreground"
              placeholder="meters"
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="decimal-pad"
              value={distance}
              onChangeText={(v) => { setDistance(v); setSaved(false); }}
              onBlur={handleSave}
            />
          </>
        )}

        {showRestButton ? (
          <Pressable onPress={onStartRest} className="w-10 h-10 items-center justify-center rounded-lg bg-background-100">
            <Ionicons name="timer-outline" size={18} color="rgb(163, 163, 163)" />
          </Pressable>
        ) : !hideSetNumber ? (
          <View className="w-10" />
        ) : null}

        {onRemove && (
          <Pressable onPress={onRemove} className="w-8 h-8 items-center justify-center">
            <Ionicons name="trash-outline" size={16} color="rgb(239, 68, 68)" />
          </Pressable>
        )}
      </View>

      {lastText && (
        <View className="ml-10 -mt-1 mb-1">
          <Text className="text-xs text-foreground-subtle">{lastText}</Text>
        </View>
      )}
    </View>
  );
}
