/** Import service - idempotent JSON import of personal foods, saved meals, and daily targets. */
import type * as SQLite from 'expo-sqlite';
import * as foodItemModel from '@backend/models/foodItem';
import * as savedMealModel from '@backend/models/savedMeal';
import type { ImportMeal, ImportPayload, ImportResult, ServingUnit } from '@shared/types/food';

const SERVING_UNITS: ServingUnit[] = ['g', 'ml', 'unit'];

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validate(payload: ImportPayload): void {
  const foods = payload.foods ?? [];
  const meals = payload.meals ?? [];

  foods.forEach((f, i) => {
    if (!f || typeof f.name !== 'string' || !f.name.trim()) throw new Error(`Food #${i + 1}: missing name`);
    const serving = f.serving ?? 100;
    if (!(isNum(serving) && serving > 0)) throw new Error(`Food "${f.name}": invalid serving`);
    if (f.unit != null && !SERVING_UNITS.includes(f.unit)) {
      throw new Error(`Food "${f.name}": unit must be g, ml, or unit`);
    }
    for (const [k, v] of [
      ['calories', f.calories],
      ['protein', f.protein],
      ['carbs', f.carbs],
      ['fat', f.fat],
    ] as const) {
      if (!(isNum(v) && v >= 0)) throw new Error(`Food "${f.name}": invalid ${k}`);
    }
  });

  meals.forEach((m, i) => {
    if (!m || typeof m.name !== 'string' || !m.name.trim()) throw new Error(`Meal #${i + 1}: missing name`);
    if (isComposed(m)) {
      m.components!.forEach((c) => {
        if (!c || typeof c.food !== 'string' || !c.food.trim() || !(isNum(c.amount) && c.amount > 0)) {
          throw new Error(`Meal "${m.name}": each component needs a food name and a positive amount`);
        }
      });
    } else {
      for (const [k, v] of [
        ['calories', m.calories],
        ['protein', m.protein],
        ['carbs', m.carbs],
        ['fat', m.fat],
      ] as const) {
        if (!(isNum(v) && v >= 0)) throw new Error(`Meal "${m.name}": needs components or a valid ${k}`);
      }
    }
  });

  if (payload.targets) {
    if (!(isNum(payload.targets.calories) && payload.targets.calories >= 0)) throw new Error('Invalid calorie target');
    if (!(isNum(payload.targets.protein) && payload.targets.protein >= 0)) throw new Error('Invalid protein target');
  }
}

function isComposed(m: ImportMeal): boolean {
  return Array.isArray(m.components) && m.components.length > 0;
}

/**
 * Parse + apply a personal seed JSON. Idempotent: foods and meals are matched by name
 * (case-insensitive) and updated in place, so re-running never creates duplicates. Runs in a
 * single transaction — a bad reference (e.g. a meal component naming a food that doesn't exist)
 * aborts the whole import with a clear message and leaves data untouched.
 */
export async function importFromJson(db: SQLite.SQLiteDatabase, text: string): Promise<ImportResult> {
  let payload: ImportPayload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON — check the syntax');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('JSON must be an object with foods / meals / targets');
  }
  validate(payload);

  const foods = payload.foods ?? [];
  const meals = payload.meals ?? [];
  const result: ImportResult = {
    foodsCreated: 0,
    foodsUpdated: 0,
    mealsCreated: 0,
    mealsUpdated: 0,
    targetsSet: false,
  };

  await db.withTransactionAsync(async () => {
    // Foods (upsert by name); remember the resolved id per name for meal components.
    const idByName = new Map<string, string>();
    for (const f of foods) {
      const input = {
        name: f.name.trim(),
        servingSize: f.serving ?? 100,
        servingUnit: (f.unit ?? 'g') as ServingUnit,
        calories: f.calories,
        proteinG: f.protein,
        carbsG: f.carbs,
        fatG: f.fat,
      };
      const existing = await foodItemModel.getByName(db, input.name);
      if (existing) {
        await foodItemModel.update(db, existing.id, input);
        idByName.set(input.name.toLowerCase(), existing.id);
        result.foodsUpdated++;
      } else {
        const created = await foodItemModel.create(db, input);
        idByName.set(input.name.toLowerCase(), created.id);
        result.foodsCreated++;
      }
    }

    // Meals (upsert by name).
    for (const m of meals) {
      const name = m.name.trim();
      const composed = isComposed(m);
      const items: { foodId: string; quantity: number }[] = [];
      if (composed) {
        for (const c of m.components!) {
          const key = c.food.trim().toLowerCase();
          let foodId = idByName.get(key);
          if (!foodId) {
            const pre = await foodItemModel.getByName(db, c.food.trim());
            if (pre) foodId = pre.id;
          }
          if (!foodId) throw new Error(`Meal "${name}" references unknown food "${c.food}"`);
          items.push({ foodId, quantity: c.amount });
        }
      }
      const args = composed
        ? { name, kind: 'composed' as const, calories: null, proteinG: null, carbsG: null, fatG: null }
        : {
            name,
            kind: 'manual' as const,
            calories: m.calories!,
            proteinG: m.protein!,
            carbsG: m.carbs!,
            fatG: m.fat!,
          };
      const existing = await savedMealModel.getByName(db, name);
      if (existing) {
        await savedMealModel.updateMeal(db, existing.id, args);
        await savedMealModel.replaceItems(db, existing.id, items);
        result.mealsUpdated++;
      } else {
        const id = await savedMealModel.createMeal(db, args);
        await savedMealModel.replaceItems(db, id, items);
        result.mealsCreated++;
      }
    }

    // Targets (settings key/value upsert; store is refreshed by the caller).
    if (payload.targets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('dailyCalorieTarget', ?)`,
        String(Math.round(payload.targets.calories))
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('dailyProteinTarget', ?)`,
        String(Math.round(payload.targets.protein))
      );
      result.targetsSet = true;
    }
  });

  return result;
}
