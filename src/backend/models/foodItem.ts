/** Food item model - CRUD for the food_items table (per-serving macros). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { FoodItem, FoodItemInput, ServingUnit } from '@shared/types/food';

interface FoodItemRow {
  id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  archived_at: string | null;
  created_at: string;
}

function mapRow(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit as ServingUnit,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function getById(db: SQLite.SQLiteDatabase, id: string): Promise<FoodItem | null> {
  const row = await db.getFirstAsync<FoodItemRow>(`SELECT * FROM food_items WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

/** All foods, alphabetical. Excludes archived unless requested. */
export async function getAll(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<FoodItem[]> {
  const rows = await db.getAllAsync<FoodItemRow>(
    `SELECT * FROM food_items
     ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(mapRow);
}

export async function create(db: SQLite.SQLiteDatabase, input: FoodItemInput): Promise<FoodItem> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO food_items (id, name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.servingSize,
    input.servingUnit,
    input.calories,
    input.proteinG,
    input.carbsG,
    input.fatG
  );
  const food = await getById(db, id);
  if (!food) throw new Error(`Failed to create food with id ${id}`);
  return food;
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  input: FoodItemInput
): Promise<FoodItem> {
  await db.runAsync(
    `UPDATE food_items
     SET name = ?, serving_size = ?, serving_unit = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    input.name,
    input.servingSize,
    input.servingUnit,
    input.calories,
    input.proteinG,
    input.carbsG,
    input.fatG,
    id
  );
  const food = await getById(db, id);
  if (!food) throw new Error(`Food with id ${id} not found after update`);
  return food;
}

/** Soft-delete: keeps the row so composed meals and logged entries that reference it stay valid. */
export async function archive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE food_items SET archived_at = datetime('now') WHERE id = ?`, id);
}

export async function unarchive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE food_items SET archived_at = NULL WHERE id = ?`, id);
}
