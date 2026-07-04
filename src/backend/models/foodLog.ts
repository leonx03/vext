/** Food log model - CRUD for food_log_entries (a food/meal logged to a date, macros snapshotted). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { DailyTotals, FoodLogEntry, FoodLogEntryType } from '@shared/types/food';

interface FoodLogRow {
  id: string;
  date: string;
  entry_type: string;
  food_id: string | null;
  saved_meal_id: string | null;
  quantity: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

function mapRow(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.id,
    date: row.date,
    entryType: row.entry_type as FoodLogEntryType,
    foodId: row.food_id,
    savedMealId: row.saved_meal_id,
    quantity: row.quantity,
    name: row.name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    createdAt: row.created_at,
  };
}

export async function getByDate(db: SQLite.SQLiteDatabase, date: string): Promise<FoodLogEntry[]> {
  const rows = await db.getAllAsync<FoodLogRow>(
    `SELECT * FROM food_log_entries WHERE date = ? ORDER BY created_at ASC`,
    date
  );
  return rows.map(mapRow);
}

export async function getById(db: SQLite.SQLiteDatabase, id: string): Promise<FoodLogEntry | null> {
  const row = await db.getFirstAsync<FoodLogRow>(`SELECT * FROM food_log_entries WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

export async function getDailyTotals(db: SQLite.SQLiteDatabase, date: string): Promise<DailyTotals> {
  const row = await db.getFirstAsync<{
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    n: number;
  }>(
    `SELECT SUM(calories) AS calories, SUM(protein_g) AS protein_g,
            SUM(carbs_g) AS carbs_g, SUM(fat_g) AS fat_g, COUNT(*) AS n
     FROM food_log_entries WHERE date = ?`,
    date
  );
  return {
    calories: row?.calories ?? 0,
    proteinG: row?.protein_g ?? 0,
    carbsG: row?.carbs_g ?? 0,
    fatG: row?.fat_g ?? 0,
    entryCount: row?.n ?? 0,
  };
}

interface CreateLogArgs {
  date: string;
  entryType: FoodLogEntryType;
  foodId?: string | null;
  savedMealId?: string | null;
  quantity: number;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function create(db: SQLite.SQLiteDatabase, args: CreateLogArgs): Promise<FoodLogEntry> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO food_log_entries
       (id, date, entry_type, food_id, saved_meal_id, quantity, name, calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    args.date,
    args.entryType,
    args.foodId ?? null,
    args.savedMealId ?? null,
    args.quantity,
    args.name,
    args.calories,
    args.proteinG,
    args.carbsG,
    args.fatG
  );
  const entry = await getById(db, id);
  if (!entry) throw new Error(`Failed to create food log entry with id ${id}`);
  return entry;
}

/** Update an entry's quantity and its (re-scaled) macro snapshot. */
export async function updateSnapshot(
  db: SQLite.SQLiteDatabase,
  id: string,
  args: { quantity: number; calories: number; proteinG: number; carbsG: number; fatG: number }
): Promise<FoodLogEntry> {
  await db.runAsync(
    `UPDATE food_log_entries SET quantity = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    args.quantity,
    args.calories,
    args.proteinG,
    args.carbsG,
    args.fatG,
    id
  );
  const entry = await getById(db, id);
  if (!entry) throw new Error(`Food log entry with id ${id} not found after update`);
  return entry;
}

export async function remove(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM food_log_entries WHERE id = ?`, id);
}
