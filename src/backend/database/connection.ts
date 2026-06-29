/** Database connection - initializes expo-sqlite and runs migrations on first load. */
import * as SQLite from 'expo-sqlite';
import { APP_CONFIG } from '@config/app';
import { runMigrations } from './migrations';
import { seedDatabase } from './seed';
import { seedDefaultSplit } from './seedSplit';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(APP_CONFIG.database.name);

  // Enable WAL mode for crash resilience
  await db.execAsync('PRAGMA journal_mode = WAL');
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Run migrations and seed data
  await runMigrations(db);
  await seedDatabase(db);
  await seedDefaultSplit(db);

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
