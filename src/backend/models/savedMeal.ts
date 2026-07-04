/** Saved meal model - manages saved_meals + saved_meal_items (composed or manual meals). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { SavedMeal, SavedMealItem, SavedMealKind, ServingUnit } from '@shared/types/food';

interface SavedMealRow {
  id: string;
  name: string;
  kind: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  archived_at: string | null;
  created_at: string;
}

function mapRow(row: SavedMealRow): SavedMeal {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as SavedMealKind,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function getById(db: SQLite.SQLiteDatabase, id: string): Promise<SavedMeal | null> {
  const row = await db.getFirstAsync<SavedMealRow>(`SELECT * FROM saved_meals WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

/** Find an active (non-archived) saved meal by name, case-insensitive. Used for idempotent import. */
export async function getByName(db: SQLite.SQLiteDatabase, name: string): Promise<SavedMeal | null> {
  const row = await db.getFirstAsync<SavedMealRow>(
    `SELECT * FROM saved_meals WHERE name = ? COLLATE NOCASE AND archived_at IS NULL
     ORDER BY created_at ASC LIMIT 1`,
    name
  );
  return row ? mapRow(row) : null;
}

export async function getAll(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<SavedMeal[]> {
  const rows = await db.getAllAsync<SavedMealRow>(
    `SELECT * FROM saved_meals
     ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(mapRow);
}

/** Items of a composed meal, with the referenced food joined in, ordered by position. */
export async function getItems(db: SQLite.SQLiteDatabase, mealId: string): Promise<SavedMealItem[]> {
  const rows = await db.getAllAsync<{
    id: string;
    saved_meal_id: string;
    food_id: string;
    quantity: number;
    position: number;
    f_name: string;
    f_serving_size: number;
    f_serving_unit: string;
    f_calories: number;
    f_protein_g: number;
    f_carbs_g: number;
    f_fat_g: number;
    f_archived_at: string | null;
    f_created_at: string;
  }>(
    `SELECT smi.id, smi.saved_meal_id, smi.food_id, smi.quantity, smi.position,
            f.name AS f_name, f.serving_size AS f_serving_size, f.serving_unit AS f_serving_unit,
            f.calories AS f_calories, f.protein_g AS f_protein_g, f.carbs_g AS f_carbs_g,
            f.fat_g AS f_fat_g, f.archived_at AS f_archived_at, f.created_at AS f_created_at
     FROM saved_meal_items smi
     JOIN food_items f ON f.id = smi.food_id
     WHERE smi.saved_meal_id = ?
     ORDER BY smi.position ASC`,
    mealId
  );
  return rows.map((r) => ({
    id: r.id,
    savedMealId: r.saved_meal_id,
    foodId: r.food_id,
    quantity: r.quantity,
    position: r.position,
    food: {
      id: r.food_id,
      name: r.f_name,
      servingSize: r.f_serving_size,
      servingUnit: r.f_serving_unit as ServingUnit,
      calories: r.f_calories,
      proteinG: r.f_protein_g,
      carbsG: r.f_carbs_g,
      fatG: r.f_fat_g,
      archivedAt: r.f_archived_at,
      createdAt: r.f_created_at,
    },
  }));
}

/**
 * Aggregated totals for every composed meal, grouped by meal id (one query, no N+1).
 * Manual meals aren't included here — their totals live on the saved_meals row.
 */
export async function getComposedTotals(
  db: SQLite.SQLiteDatabase
): Promise<Record<string, { calories: number; proteinG: number; carbsG: number; fatG: number }>> {
  const rows = await db.getAllAsync<{
    saved_meal_id: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>(
    `SELECT smi.saved_meal_id,
            SUM(f.calories  * smi.quantity / f.serving_size) AS calories,
            SUM(f.protein_g * smi.quantity / f.serving_size) AS protein_g,
            SUM(f.carbs_g   * smi.quantity / f.serving_size) AS carbs_g,
            SUM(f.fat_g     * smi.quantity / f.serving_size) AS fat_g
     FROM saved_meal_items smi
     JOIN food_items f ON f.id = smi.food_id
     GROUP BY smi.saved_meal_id`
  );
  const map: Record<string, { calories: number; proteinG: number; carbsG: number; fatG: number }> = {};
  for (const r of rows) {
    map[r.saved_meal_id] = {
      calories: r.calories,
      proteinG: r.protein_g,
      carbsG: r.carbs_g,
      fatG: r.fat_g,
    };
  }
  return map;
}

interface CreateMealArgs {
  name: string;
  kind: SavedMealKind;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}

export async function createMeal(db: SQLite.SQLiteDatabase, args: CreateMealArgs): Promise<string> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO saved_meals (id, name, kind, calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    args.name,
    args.kind,
    args.calories ?? null,
    args.proteinG ?? null,
    args.carbsG ?? null,
    args.fatG ?? null
  );
  return id;
}

export async function updateMeal(db: SQLite.SQLiteDatabase, id: string, args: CreateMealArgs): Promise<void> {
  await db.runAsync(
    `UPDATE saved_meals SET name = ?, kind = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    args.name,
    args.kind,
    args.calories ?? null,
    args.proteinG ?? null,
    args.carbsG ?? null,
    args.fatG ?? null,
    id
  );
}

/** Replace all items for a meal (delete + reinsert). Call within a transaction. */
export async function replaceItems(
  db: SQLite.SQLiteDatabase,
  mealId: string,
  items: { foodId: string; quantity: number }[]
): Promise<void> {
  await db.runAsync(`DELETE FROM saved_meal_items WHERE saved_meal_id = ?`, mealId);
  for (let i = 0; i < items.length; i++) {
    await db.runAsync(
      `INSERT INTO saved_meal_items (id, saved_meal_id, food_id, quantity, position)
       VALUES (?, ?, ?, ?, ?)`,
      Crypto.randomUUID(),
      mealId,
      items[i].foodId,
      items[i].quantity,
      i
    );
  }
}

export async function archive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE saved_meals SET archived_at = datetime('now') WHERE id = ?`, id);
}

export async function unarchive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE saved_meals SET archived_at = NULL WHERE id = ?`, id);
}
