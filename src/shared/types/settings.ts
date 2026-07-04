/** Settings types - TypeScript interfaces for user preferences (units, theme). */
export type UnitSystem = 'metric' | 'imperial';

export interface AppSettings {
  units: UnitSystem;
  defaultRestSeconds: number;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
}
