/** Split model - manages the splits table (create, list, update, delete, reorder). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Split } from '@shared/types/split';

interface SplitRow {
  id: string;
  name: string;
  description: string | null;
  is_default: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
}

function mapRow(row: SplitRow): Split {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  name: string,
  description?: string | null,
  isDefault = false
): Promise<Split> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO splits (id, name, description, is_default, sort_order, created_at)
     VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM splits), datetime('now'))`,
    id,
    name,
    description ?? null,
    isDefault ? 1 : 0
  );
  const split = await getById(db, id);
  if (!split) throw new Error(`Failed to create split with id ${id}`);
  return split;
}

export async function getById(db: SQLite.SQLiteDatabase, id: string): Promise<Split | null> {
  const row = await db.getFirstAsync<SplitRow>(`SELECT * FROM splits WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

/** All splits, optionally including archived ones, ordered by sort order. */
export async function getAll(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<Split[]> {
  const rows = await db.getAllAsync<SplitRow>(
    `SELECT * FROM splits
     ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY sort_order ASC`
  );
  return rows.map(mapRow);
}

export async function getDefault(db: SQLite.SQLiteDatabase): Promise<Split | null> {
  const row = await db.getFirstAsync<SplitRow>(
    `SELECT * FROM splits WHERE is_default = 1 LIMIT 1`
  );
  return row ? mapRow(row) : null;
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: { name?: string; description?: string | null }
): Promise<void> {
  if (data.name !== undefined) {
    await db.runAsync(`UPDATE splits SET name = ? WHERE id = ?`, data.name, id);
  }
  if (data.description !== undefined) {
    await db.runAsync(`UPDATE splits SET description = ? WHERE id = ?`, data.description, id);
  }
}

export async function remove(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  // split_days cascade via FK; scheduled_workouts.split_id is set to NULL.
  await db.runAsync(`DELETE FROM splits WHERE id = ?`, id);
}
