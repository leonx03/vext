/** Profile screen - user settings, body weight tracking, and app info. */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useSettingsStore } from '@backend/store/settingsStore';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { useBodyWeightHistory, useLogBodyWeight, useDeleteBodyWeight, useBodyWeightWeeklyAverages } from '@frontend/hooks/useBodyWeight';
import { WeightSparkline } from '@frontend/components/profile/WeightSparkline';
import { WeeklyAverages } from '@frontend/components/profile/WeeklyAverages';
import { GymManager } from '@frontend/components/profile/GymManager';
import { SelectPicker } from '@frontend/components/overlay/SelectPicker';
import { WeightHistorySheet } from '@frontend/components/overlay/WeightHistorySheet';
import { ImportSheet } from '@frontend/components/food/ImportSheet';
import type { UnitSystem } from '@shared/types/settings';

const RELEASES_URL = 'https://github.com/leonx03/vext/releases';
const APP_VERSION = Constants.expoConfig?.version ?? '?';

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
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: weightHistory } = useBodyWeightHistory();
  const { data: weeklyAverages } = useBodyWeightWeeklyAverages(8);
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

          {/* Weekly averages */}
          {weeklyAverages && weeklyAverages.length > 0 && (
            <View className="mb-3 border-t border-background-100 pt-3">
              <WeeklyAverages weeks={weeklyAverages} units={units} />
            </View>
          )}

          {/* History */}
          {weightHistory && weightHistory.length > 0 ? (
            <Pressable
              onPress={() => setShowWeightHistory(true)}
              className="flex-row items-center justify-between rounded-lg bg-background-100 px-3 py-3"
            >
              <Text className="text-sm text-foreground">
                View history ({weightHistory.length} {weightHistory.length === 1 ? 'entry' : 'entries'})
              </Text>
              <Ionicons name="chevron-forward" size={16} color="rgb(163, 163, 163)" />
            </Pressable>
          ) : (
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

        {/* Gyms */}
        <GymManager />

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

        {/* Data */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">Data</Text>
          <Pressable
            onPress={() => setShowImport(true)}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="download-outline" size={20} color="rgb(163, 163, 163)" />
              <Text className="text-base text-foreground">Import from JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgb(163, 163, 163)" />
          </Pressable>
          <Text className="mt-2 text-xs text-foreground-subtle">
            Bulk-add foods, saved meals, and targets. Safe to run more than once.
          </Text>
        </View>

        {/* About */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
          <Text className="text-sm font-medium text-foreground-muted mb-3">About</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-foreground">Vext</Text>
            <Text className="text-sm text-foreground-subtle">v{APP_VERSION}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(RELEASES_URL)}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-lg bg-background-100 py-3"
          >
            <Ionicons name="cloud-download-outline" size={18} color="rgb(52, 211, 153)" />
            <Text className="text-sm font-semibold text-primary">Check for Updates</Text>
          </Pressable>
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

      <WeightHistorySheet
        visible={showWeightHistory}
        entries={weightHistory ?? []}
        units={units}
        onDelete={(id) => deleteWeight.mutate(id)}
        onClose={() => setShowWeightHistory(false)}
      />

      <ImportSheet visible={showImport} onClose={() => setShowImport(false)} />
    </View>
  );
}
