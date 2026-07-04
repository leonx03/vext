/** Settings store - Zustand store for user preferences (units, theme). */
import { create } from 'zustand';
import { Platform, NativeModules } from 'react-native';
import type * as SQLite from 'expo-sqlite';
import type { AppSettings, UnitSystem } from '@shared/types/settings';
import { APP_CONFIG } from '@config/app';

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  loadSettings: (db: SQLite.SQLiteDatabase) => Promise<void>;
  updateUnits: (db: SQLite.SQLiteDatabase, units: UnitSystem) => Promise<void>;
  updateDefaultRestSeconds: (db: SQLite.SQLiteDatabase, seconds: number) => Promise<void>;
  updateMacroTargets: (
    db: SQLite.SQLiteDatabase,
    targets: { dailyCalorieTarget: number; dailyProteinTarget: number }
  ) => Promise<void>;
}

function getLocaleDefaultUnits(): UnitSystem {
  try {
    const locale: string =
      Platform.OS === 'ios'
        ? (NativeModules.SettingsManager?.settings?.AppleLocale as string) ??
          (NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] as string) ??
          'en'
        : (NativeModules.I18nManager?.localeIdentifier as string) ?? 'en';

    const imperialLocales = ['en_US', 'en_MM', 'en_LR', 'en-US', 'en-MM', 'en-LR'];
    if (imperialLocales.some((l) => locale.startsWith(l))) {
      return 'imperial';
    }
  } catch {
    // Fall through to default
  }
  return 'metric';
}

async function readSetting(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

async function writeSetting(db: SQLite.SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  units: APP_CONFIG.defaults.units,
  defaultRestSeconds: APP_CONFIG.defaults.restSeconds.strength,
  dailyCalorieTarget: APP_CONFIG.defaults.dailyCalorieTarget,
  dailyProteinTarget: APP_CONFIG.defaults.dailyProteinTarget,
  isLoaded: false,

  loadSettings: async (db) => {
    const unitsVal = await readSetting(db, 'units');
    const restVal = await readSetting(db, 'defaultRestSeconds');
    const calorieVal = await readSetting(db, 'dailyCalorieTarget');
    const proteinVal = await readSetting(db, 'dailyProteinTarget');

    const validUnits: UnitSystem[] = ['metric', 'imperial'];
    const units: UnitSystem = validUnits.includes(unitsVal as UnitSystem)
      ? (unitsVal as UnitSystem)
      : getLocaleDefaultUnits();
    const defaultRestSeconds = restVal ? parseInt(restVal, 10) : APP_CONFIG.defaults.restSeconds.strength;
    const dailyCalorieTarget = calorieVal ? parseInt(calorieVal, 10) : APP_CONFIG.defaults.dailyCalorieTarget;
    const dailyProteinTarget = proteinVal ? parseInt(proteinVal, 10) : APP_CONFIG.defaults.dailyProteinTarget;

    // Persist locale-based default if no setting exists yet
    if (!unitsVal) {
      await writeSetting(db, 'units', units);
    }
    if (!restVal) {
      await writeSetting(db, 'defaultRestSeconds', String(defaultRestSeconds));
    }

    set({ units, defaultRestSeconds, dailyCalorieTarget, dailyProteinTarget, isLoaded: true });
  },

  updateUnits: async (db, units) => {
    await writeSetting(db, 'units', units);
    set({ units });
  },

  updateDefaultRestSeconds: async (db, seconds) => {
    await writeSetting(db, 'defaultRestSeconds', String(seconds));
    set({ defaultRestSeconds: seconds });
  },

  updateMacroTargets: async (db, { dailyCalorieTarget, dailyProteinTarget }) => {
    await writeSetting(db, 'dailyCalorieTarget', String(dailyCalorieTarget));
    await writeSetting(db, 'dailyProteinTarget', String(dailyProteinTarget));
    set({ dailyCalorieTarget, dailyProteinTarget });
  },
}));
