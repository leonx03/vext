/** Profile screen - user settings, body weight tracking, and app info. */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@backend/store/settingsStore';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { useBodyWeightHistory, useLogBodyWeight, useDeleteBodyWeight } from '@frontend/hooks/useBodyWeight';
import { WeightSparkline } from '@frontend/components/profile/WeightSparkline';
import { SelectPicker } from '@frontend/components/overlay/SelectPicker';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { formatWeight } from '@shared/utils/formatting';
import type { UnitSystem } from '@shared/types/settings';

const REST_OPTIONS = [
  { label: '30 seconds', value: '30' },
  { label: '60 seconds', value: '60' },
  { label: '90 seconds', value: '90' },
  { label: '2 minutes', value: '120' },
  { label: '3 minutes', value: '180' },
  { label: '5 minutes', value: '300' },
];

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseWeightInput(input: string, units: UnitSystem): number | null {
  const val = parseFloat(input);
  if (isNaN(val) || val <= 0) return null;
  return units === 'imperial' ? val / 2.20462 : val;
}

export default function ProfileScreen() {
  const db = useDatabase();
  const { units, defaultRestSeconds, isLoaded, loadSettings, updateUnits, updateDefaultRestSeconds } = useSettingsStore();
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null);

  const { data: weightHistory } = useBodyWeightHistory();
  const logWeight = useLogBodyWeight();
  const deleteWeight = useDeleteBodyWeight();

  useEffect(() => {
    if (!isLoaded) loadSettings(db);
  }, [db, isLoaded, loadSettings]);

  const handleUnitsToggle = (useImperial: boolean) => {
    const newUnits: UnitSystem = useImperial ? 'imperial' : 'metric';
    updateUnits(db, newUnits);
  };

  const handleLogWeight = () => {
    setWeightError(null);
    const kg = parseWeightInput(weightInput, units);
    if (kg == null) {
      setWeightError('Enter a valid weight');
      return;
    }
    logWeight.mutate(
      { weightKg: kg, date: getTodayDate() },
      {
        onSuccess: () => setWeightInput(''),
        onError: (err) => setWeightError(err.message),
      }
    );
  };

  const restLabel = REST_OPTIONS.find((o) => o.value === String(defaultRestSeconds))?.label ?? `${defaultRestSeconds}s`;
  const unitLabel = units === 'imperial' ? 'lb' : 'kg';

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="pb-[100px]">
        <View className="px-4 py-3">
          <Text className="text-2xl font-bold text-foreground">Settings</Text>
        </View>

        {/* Body Weight */}
        <View className="mx-4 mt-2 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">Body Weight</Text>

          {/* Input row */}
          <View className="flex-row items-center gap-2 mb-3">
            <TextInput
              className="flex-1 h-10 rounded-lg bg-background-100 px-3 text-sm text-foreground"
              placeholder={`Weight (${unitLabel})`}
              placeholderTextColor="rgb(115, 115, 115)"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              onSubmitEditing={handleLogWeight}
            />
            <Pressable
              onPress={handleLogWeight}
              disabled={logWeight.isPending}
              className="rounded-lg bg-primary px-4 h-10 items-center justify-center"
            >
              <Text className="text-sm font-semibold text-background">
                {logWeight.isPending ? '...' : 'Log'}
              </Text>
            </Pressable>
          </View>
          {weightError && (
            <Text className="text-xs text-destructive mb-2">{weightError}</Text>
          )}
          <Text className="text-xs text-foreground-subtle mb-3">
            Logs for today ({getTodayDate()}). Logging again updates today's entry.
          </Text>

          {/* Sparkline */}
          {weightHistory && weightHistory.length > 0 && (
            <View className="mb-3">
              <WeightSparkline entries={weightHistory.slice(0, 30)} units={units} />
            </View>
          )}

          {/* History list */}
          {weightHistory?.map((entry) => (
            <View key={entry.id} className="flex-row items-center justify-between py-2 border-b border-background-100">
              <View>
                <Text className="text-sm text-foreground">{formatWeight(entry.weightKg, units)}</Text>
                <Text className="text-xs text-foreground-subtle">{entry.date}</Text>
              </View>
              <Pressable
                onPress={() => setDeleteTarget({ id: entry.id, date: entry.date })}
                className="p-1.5"
              >
                <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
              </Pressable>
            </View>
          ))}

          {(!weightHistory || weightHistory.length === 0) && (
            <Text className="text-xs text-foreground-subtle text-center py-3">No entries yet</Text>
          )}
        </View>

        {/* Units */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">Units</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="scale-outline" size={20} color="rgb(163, 163, 163)" />
              <Text className="text-base text-foreground">Imperial (lb, mi)</Text>
            </View>
            <Switch
              value={units === 'imperial'}
              onValueChange={handleUnitsToggle}
              trackColor={{ false: 'rgb(38, 38, 38)', true: 'rgb(52, 211, 153)' }}
              thumbColor="rgb(250, 250, 250)"
            />
          </View>
          <Text className="mt-2 text-xs text-foreground-subtle">
            Currently using {units === 'metric' ? 'metric (kg, km)' : 'imperial (lb, mi)'}
          </Text>
        </View>

        {/* Rest timer default */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">Rest Timer</Text>
          <Pressable
            onPress={() => setShowRestPicker(true)}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="timer-outline" size={20} color="rgb(163, 163, 163)" />
              <Text className="text-base text-foreground">Default rest duration</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-primary">{restLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgb(163, 163, 163)" />
            </View>
          </Pressable>
        </View>

        {/* About */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">About</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-foreground">Vext</Text>
            <Text className="text-sm text-foreground-subtle">v1.0.0</Text>
          </View>
        </View>

        {/* Coming soon */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">Coming Soon</Text>
          {['Data Export', 'Custom Exercises', 'Theme Customization'].map((feature) => (
            <View key={feature} className="flex-row items-center justify-between py-2">
              <Text className="text-base text-foreground-subtle">{feature}</Text>
              <View className="rounded-full bg-background-100 px-2 py-0.5">
                <Text className="text-xs text-foreground-subtle">Soon</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <SelectPicker
        visible={showRestPicker}
        title="Default Rest Duration"
        options={REST_OPTIONS}
        selectedValue={String(defaultRestSeconds)}
        onSelect={(val) => updateDefaultRestSeconds(db, parseInt(val, 10))}
        onClose={() => setShowRestPicker(false)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Entry"
        message={`Delete weight entry for ${deleteTarget?.date}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteWeight.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
