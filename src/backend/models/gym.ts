/** Gym model - manages the gyms table (create, list, rename, archive). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Gym } from '@shared/types/gym';

interface GymRow {
  id: string;
  name: string;
  is_default: number;
  archived_at: string | null;
  sort_order: number;
  created_at: string;
}

function mapRow(row: GymRow): Gym {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    archivedAt: row.archived_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function create(db: SQLite.SQLiteDatabase, name: string): Promise<Gym> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO gyms (id, name, is_default, sort_order, created_at)
     VALUES (?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM gyms), datetime('now'))`,
    id,
    name
  );
  const gym = await getById(db, id);
  if (!gym) throw new Error(`Failed to create gym with id ${id}`);
  return gym;
}

export async function getById(db: SQLite.SQLiteDatabase, id: string): Promise<Gym | null> {
  const row = await db.getFirstAsync<GymRow>(`SELECT * FROM gyms WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

/** All gyms, optionally including archived ones. Active gyms first, by sort order. */
export async function getAll(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<Gym[]> {
  const rows = await db.getAllAsync<GymRow>(
    `SELECT * FROM gyms
     ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY sort_order ASC`
  );
  return rows.map(mapRow);
}

/** Non-archived gyms only. */
export async function getActive(db: SQLite.SQLiteDatabase): Promise<Gym[]> {
  return getAll(db, false);
}

export async function getActiveCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM gyms WHERE archived_at IS NULL`
  );
  return row?.count ?? 0;
}

export async function getDefault(db: SQLite.SQLiteDatabase): Promise<Gym | null> {
  const row = await db.getFirstAsync<GymRow>(
    `SELECT * FROM gyms WHERE is_default = 1 LIMIT 1`
  );
  return row ? mapRow(row) : null;
}

export async function rename(
  db: SQLite.SQLiteDatabase,
  id: string,
  name: string
): Promise<void> {
  await db.runAsync(`UPDATE gyms SET name = ? WHERE id = ?`, name, id);
}

export async function archive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE gyms SET archived_at = datetime('now') WHERE id = ? AND is_default = 0`,
    id
  );
}

export async function unarchive(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE gyms SET archived_at = NULL WHERE id = ?`, id);
}
