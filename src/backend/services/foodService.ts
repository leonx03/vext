/** Food service - business logic for foods, saved meals, and daily macro logging. */
import type * as SQLite from 'expo-sqlite';
import * as foodItemModel from '@backend/models/foodItem';
import * as savedMealModel from '@backend/models/savedMeal';
import * as foodLogModel from '@backend/models/foodLog';
import { APP_CONFIG } from '@config/app';
import type {
  DailyTotals,
  FoodItem,
  FoodItemInput,
  FoodLogEntry,
  Macros,
  SavedMealInput,
  SavedMealWithTotals,
} from '@shared/types/food';

const { validation } = APP_CONFIG;

// ---- Macro math -------------------------------------------------------------

const ZERO_MACROS: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Scale a food's per-serving macros to an amount expressed in the food's serving unit. */
function scaleFood(food: FoodItem, quantity: number): Macros {
  const factor = food.servingSize > 0 ? quantity / food.servingSize : 0;
  return {
    calories: food.calories * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
  };
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    calories: m.calories * factor,
    proteinG: m.proteinG * factor,
    carbsG: m.carbsG * factor,
    fatG: m.fatG * factor,
  };
}

// ---- Validation -------------------------------------------------------------

function validateFoodInput(input: FoodItemInput): void {
  const name = input.name.trim();
  if (name.length < validation.foodName.min || name.length > validation.foodName.max) {
    throw new Error('Enter a food name');
  }
  if (input.servingSize < validation.servingSize.min || input.servingSize > validation.servingSize.max) {
    throw new Error('Enter a valid serving size');
  }
  for (const v of [input.calories, input.proteinG, input.carbsG, input.fatG]) {
    if (!Number.isFinite(v) || v < validation.macro.min || v > validation.macro.max) {
      throw new Error('Enter valid macro values');
    }
  }
}

// ---- Foods ------------------------------------------------------------------

export function getFoods(db: SQLite.SQLiteDatabase, includeArchived = false): Promise<FoodItem[]> {
  return foodItemModel.getAll(db, includeArchived);
}

export function createFood(db: SQLite.SQLiteDatabase, input: FoodItemInput): Promise<FoodItem> {
  validateFoodInput(input);
  return foodItemModel.create(db, { ...input, name: input.name.trim() });
}

export function updateFood(db: SQLite.SQLiteDatabase, id: string, input: FoodItemInput): Promise<FoodItem> {
  validateFoodInput(input);
  return foodItemModel.update(db, id, { ...input, name: input.name.trim() });
}

export function archiveFood(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  return foodItemModel.archive(db, id);
}

// ---- Saved meals ------------------------------------------------------------

/** Resolve a saved meal's per-serving totals: stored for manual, summed from items for composed. */
function resolveMealTotals(
  meal: { kind: string; calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null },
  composed: Macros | undefined
): Macros {
  if (meal.kind === 'manual') {
    return {
      calories: meal.calories ?? 0,
      proteinG: meal.proteinG ?? 0,
      carbsG: meal.carbsG ?? 0,
      fatG: meal.fatG ?? 0,
    };
  }
  return composed ?? ZERO_MACROS;
}

/** All saved meals with resolved totals (items not loaded — use getSavedMeal for the detail view). */
export async function getSavedMeals(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<SavedMealWithTotals[]> {
  const [meals, composedMap] = await Promise.all([
    savedMealModel.getAll(db, includeArchived),
    savedMealModel.getComposedTotals(db),
  ]);
  return meals.map((meal) => ({
    ...meal,
    totals: resolveMealTotals(meal, composedMap[meal.id]),
    items: [],
  }));
}

/** A single saved meal with its items (for composed) and resolved totals. */
export async function getSavedMeal(db: SQLite.SQLiteDatabase, id: string): Promise<SavedMealWithTotals | null> {
  const meal = await savedMealModel.getById(db, id);
  if (!meal) return null;
  const items = meal.kind === 'composed' ? await savedMealModel.getItems(db, id) : [];
  const composed = items.reduce<Macros>(
    (acc, it) => (it.food ? addMacros(acc, scaleFood(it.food, it.quantity)) : acc),
    ZERO_MACROS
  );
  return { ...meal, items, totals: resolveMealTotals(meal, meal.kind === 'composed' ? composed : undefined) };
}

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

function validateMealInput(input: SavedMealInput): void {
  if (input.name.trim().length < 1) throw new Error('Enter a meal name');
  if (input.kind === 'composed') {
    if (!input.items || input.items.length === 0) {
      throw new Error('Add at least one food to the meal');
    }
    for (const it of input.items) {
      if (it.quantity < validation.quantity.min || it.quantity > validation.quantity.max) {
        throw new Error('Enter a valid quantity for each food');
      }
    }
  } else {
    const t = input.totals;
    if (!t) throw new Error('Enter the meal macros');
    for (const v of [t.calories, t.proteinG, t.carbsG, t.fatG]) {
      if (!Number.isFinite(v) || v < validation.macro.min || v > validation.macro.max) {
        throw new Error('Enter valid macro values');
      }
    }
  }
}

export async function createSavedMeal(db: SQLite.SQLiteDatabase, input: SavedMealInput): Promise<string> {
  validateMealInput(input);
  let mealId = '';
  await db.withTransactionAsync(async () => {
    mealId = await savedMealModel.createMeal(db, {
      name: input.name.trim(),
      kind: input.kind,
      calories: input.kind === 'manual' ? input.totals!.calories : null,
      proteinG: input.kind === 'manual' ? input.totals!.proteinG : null,
      carbsG: input.kind === 'manual' ? input.totals!.carbsG : null,
      fatG: input.kind === 'manual' ? input.totals!.fatG : null,
    });
    if (input.kind === 'composed') {
      await savedMealModel.replaceItems(db, mealId, input.items!);
    }
  });
  return mealId;
}

export async function updateSavedMeal(db: SQLite.SQLiteDatabase, id: string, input: SavedMealInput): Promise<void> {
  validateMealInput(input);
  await db.withTransactionAsync(async () => {
    await savedMealModel.updateMeal(db, id, {
      name: input.name.trim(),
      kind: input.kind,
      calories: input.kind === 'manual' ? input.totals!.calories : null,
      proteinG: input.kind === 'manual' ? input.totals!.proteinG : null,
      carbsG: input.kind === 'manual' ? input.totals!.carbsG : null,
      fatG: input.kind === 'manual' ? input.totals!.fatG : null,
    });
    // Composed meals own their items; a manual meal has none.
    await savedMealModel.replaceItems(db, id, input.kind === 'composed' ? input.items! : []);
  });
}

export function archiveSavedMeal(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  return savedMealModel.archive(db, id);
}

// ---- Daily log --------------------------------------------------------------

export async function getDay(
  db: SQLite.SQLiteDatabase,
  date: string
): Promise<{ entries: FoodLogEntry[]; totals: DailyTotals }> {
  const [entries, totals] = await Promise.all([
    foodLogModel.getByDate(db, date),
    foodLogModel.getDailyTotals(db, date),
  ]);
  return { entries, totals };
}

/** Log a food to a date. `quantity` is the amount in the food's serving unit; macros are snapshotted. */
export async function logFood(
  db: SQLite.SQLiteDatabase,
  date: string,
  foodId: string,
  quantity: number
): Promise<FoodLogEntry> {
  if (quantity < validation.quantity.min || quantity > validation.quantity.max) {
    throw new Error('Enter a valid quantity');
  }
  const food = await foodItemModel.getById(db, foodId);
  if (!food) throw new Error('Food not found');
  const macros = scaleFood(food, quantity);
  return foodLogModel.create(db, {
    date,
    entryType: 'food',
    foodId,
    quantity,
    name: food.name,
    ...macros,
  });
}

/** Log a saved meal to a date in one tap. `servings` defaults to 1; totals are re-resolved + snapshotted. */
export async function logSavedMeal(
  db: SQLite.SQLiteDatabase,
  date: string,
  savedMealId: string,
  servings = 1
): Promise<FoodLogEntry> {
  if (servings < validation.quantity.min || servings > validation.quantity.max) {
    throw new Error('Enter a valid number of servings');
  }
  const meal = await getSavedMeal(db, savedMealId);
  if (!meal) throw new Error('Meal not found');
  const macros = scaleMacros(meal.totals, servings);
  return foodLogModel.create(db, {
    date,
    entryType: 'meal',
    savedMealId,
    quantity: servings,
    name: meal.name,
    ...macros,
  });
}

/**
 * Change a logged entry's quantity. Recomputes macros from the source food/meal when it still
 * exists; otherwise scales the stored snapshot proportionally so history stays consistent.
 */
export async function updateLogQuantity(
  db: SQLite.SQLiteDatabase,
  id: string,
  quantity: number
): Promise<FoodLogEntry> {
  if (quantity < validation.quantity.min || quantity > validation.quantity.max) {
    throw new Error('Enter a valid quantity');
  }
  const entry = await foodLogModel.getById(db, id);
  if (!entry) throw new Error('Entry not found');

  let macros: Macros | null = null;
  if (entry.entryType === 'food' && entry.foodId) {
    const food = await foodItemModel.getById(db, entry.foodId);
    if (food) macros = scaleFood(food, quantity);
  } else if (entry.entryType === 'meal' && entry.savedMealId) {
    const meal = await getSavedMeal(db, entry.savedMealId);
    if (meal) macros = scaleMacros(meal.totals, quantity);
  }
  if (!macros) {
    // Source gone — scale the existing snapshot from the old quantity.
    const factor = entry.quantity > 0 ? quantity / entry.quantity : 0;
    macros = scaleMacros(
      { calories: entry.calories, proteinG: entry.proteinG, carbsG: entry.carbsG, fatG: entry.fatG },
      factor
    );
  }
  return foodLogModel.updateSnapshot(db, id, { quantity, ...macros });
}

export function deleteLogEntry(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  return foodLogModel.remove(db, id);
}
