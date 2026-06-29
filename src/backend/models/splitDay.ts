/** SplitDay model - manages the ordered days (workout/rest) within a split. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { SplitDay, SplitDayFull, SplitDayType } from '@shared/types/split';

interface SplitDayRow {
  id: string;
  split_id: string;
  sort_order: number;
  day_type: string;
  series_id: string | null;
  label: string | null;
  created_at: string;
}

interface SplitDayFullRow extends SplitDayRow {
  series_name: string | null;
}

function mapRow(row: SplitDayRow): SplitDay {
  return {
    id: row.id,
    splitId: row.split_id,
    sortOrder: row.sort_order,
    dayType: row.day_type as SplitDayType,
    seriesId: row.series_id,
    label: row.label,
    createdAt: row.created_at,
  };
}

function mapFullRow(row: SplitDayFullRow): SplitDayFull {
  return { ...mapRow(row), seriesName: row.series_name };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  splitId: string,
  dayType: SplitDayType,
  seriesId?: string | null,
  label?: string | null
): Promise<SplitDay> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO split_days (id, split_id, sort_order, day_type, series_id, label, created_at)
     VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM split_days WHERE split_id = ?), ?, ?, ?, datetime('now'))`,
    id,
    splitId,
    splitId,
    dayType,
    dayType === 'rest' ? null : (seriesId ?? null),
    label ?? null
  );
  const row = await db.getFirstAsync<SplitDayRow>(`SELECT * FROM split_days WHERE id = ?`, id);
  if (!row) throw new Error(`Failed to create split day with id ${id}`);
  return mapRow(row);
}

/** Ordered days for a split, with the linked series name resolved. */
export async function getBySplit(
  db: SQLite.SQLiteDatabase,
  splitId: string
): Promise<SplitDayFull[]> {
  const rows = await db.getAllAsync<SplitDayFullRow>(
    `SELECT sd.*, ws.name AS series_name
     FROM split_days sd
     LEFT JOIN workout_series ws ON ws.id = sd.series_id
     WHERE sd.split_id = ?
     ORDER BY sd.sort_order ASC`,
    splitId
  );
  return rows.map(mapFullRow);
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: { dayType?: SplitDayType; seriesId?: string | null; label?: string | null }
): Promise<void> {
  if (data.dayType !== undefined) {
    await db.runAsync(`UPDATE split_days SET day_type = ? WHERE id = ?`, data.dayType, id);
    // A rest day can't carry a series.
    if (data.dayType === 'rest') {
      await db.runAsync(`UPDATE split_days SET series_id = NULL WHERE id = ?`, id);
    }
  }
  if (data.seriesId !== undefined) {
    await db.runAsync(`UPDATE split_days SET series_id = ? WHERE id = ?`, data.seriesId, id);
  }
  if (data.label !== undefined) {
    await db.runAsync(`UPDATE split_days SET label = ? WHERE id = ?`, data.label, id);
  }
}

export async function remove(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM split_days WHERE id = ?`, id);
}

/** Persist a new ordering. `orderedIds` is the full set of day ids in their target order. */
export async function reorder(
  db: SQLite.SQLiteDatabase,
  orderedIds: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(`UPDATE split_days SET sort_order = ? WHERE id = ?`, i, orderedIds[i]);
    }
  });
}
