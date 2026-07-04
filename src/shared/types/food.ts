/** Food & macro tracking types - foods, saved meals, and daily log entries. */

export type ServingUnit = 'g' | 'ml' | 'unit';
export type SavedMealKind = 'composed' | 'manual';
export type FoodLogEntryType = 'food' | 'meal';

/** The four tracked macros. Calories are kcal; protein/carbs/fat are grams. */
export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A food with macros defined per `servingSize` of `servingUnit` (e.g. per 100 g). */
export interface FoodItem {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: ServingUnit;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface FoodItemInput {
  name: string;
  servingSize: number;
  servingUnit: ServingUnit;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** One food + quantity within a composed saved meal. `food` is joined in for display/compute. */
export interface SavedMealItem {
  id: string;
  savedMealId: string;
  foodId: string;
  quantity: number; // amount in the food's servingUnit
  position: number;
  food?: FoodItem;
}

/** A named, reusable meal: either composed of foods, or a manual fixed macro total. */
export interface SavedMeal {
  id: string;
  name: string;
  kind: SavedMealKind;
  // Only populated (and authoritative) when kind === 'manual'.
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  archivedAt: string | null;
  createdAt: string;
}

/** A saved meal with its resolved per-serving totals (and items, for composed meals). */
export interface SavedMealWithTotals extends SavedMeal {
  totals: Macros;
  items: SavedMealItem[]; // empty for manual meals
}

/** Input for creating/updating a saved meal. For 'composed', pass items; for 'manual', pass totals. */
export interface SavedMealInput {
  name: string;
  kind: SavedMealKind;
  totals?: Macros; // required for 'manual'
  items?: { foodId: string; quantity: number }[]; // required for 'composed'
}

/** A food or saved meal logged to a date, with a snapshot of the resolved (scaled) macros. */
export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  entryType: FoodLogEntryType;
  foodId: string | null;
  savedMealId: string | null;
  quantity: number; // food: amount in servingUnit · meal: number of servings
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: string;
}

export interface DailyTotals extends Macros {
  entryCount: number;
}

/** Per-install daily macro targets (stored in the settings key/value table). */
export interface MacroTargets {
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
}

// ---- JSON import (personal seed data) --------------------------------------
// Human-writable shapes used by the "Import from JSON" feature. Macros use plain
// keys (protein/carbs/fat) rather than the internal *G suffix for readability.

export interface ImportFood {
  name: string;
  serving?: number; // defaults to 100
  unit?: ServingUnit; // defaults to 'g'
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ImportMealComponent {
  food: string; // references an ImportFood.name (or an existing food)
  amount: number; // in the referenced food's serving unit
}

export interface ImportMeal {
  name: string;
  /** Present => composed meal built from these components. */
  components?: ImportMealComponent[];
  /** Present (and no components) => manual fixed-total meal. */
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ImportPayload {
  targets?: { calories: number; protein: number };
  foods?: ImportFood[];
  meals?: ImportMeal[];
}

export interface ImportResult {
  foodsCreated: number;
  foodsUpdated: number;
  mealsCreated: number;
  mealsUpdated: number;
  targetsSet: boolean;
}
