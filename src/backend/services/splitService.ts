/** Split service - business logic for workout splits: CRUD, day editing, apply/clear cycles. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as splitModel from '@backend/models/split';
import * as splitDayModel from '@backend/models/splitDay';
import * as scheduledWorkoutModel from '@backend/models/scheduledWorkout';
import type { Split, SplitDayType, SplitFull, SeriesTemplate, SeriesTemplateExercise } from '@shared/types/split';

export async function getSplits(db: SQLite.SQLiteDatabase): Promise<Split[]> {
  return splitModel.getAll(db);
}

export async function getSplitFull(
  db: SQLite.SQLiteDatabase,
  splitId: string
): Promise<SplitFull | null> {
  const split = await splitModel.getById(db, splitId);
  if (!split) return null;
  const days = await splitDayModel.getBySplit(db, splitId);
  return { ...split, days };
}

export async function createSplit(
  db: SQLite.SQLiteDatabase,
  name: string,
  description?: string | null
): Promise<Split> {
  return splitModel.create(db, name, description);
}

export async function updateSplit(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: { name?: string; description?: string | null }
): Promise<void> {
  return splitModel.update(db, id, data);
}

export async function deleteSplit(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  return splitModel.remove(db, id);
}

// --- Day editing ---

export async function addDay(
  db: SQLite.SQLiteDatabase,
  splitId: string,
  dayType: SplitDayType,
  seriesId?: string | null,
  label?: string | null
): Promise<void> {
  await splitDayModel.create(db, splitId, dayType, seriesId, label);
}

export async function removeDay(db: SQLite.SQLiteDatabase, dayId: string): Promise<void> {
  return splitDayModel.remove(db, dayId);
}

export async function reorderDays(
  db: SQLite.SQLiteDatabase,
  orderedIds: string[]
): Promise<void> {
  return splitDayModel.reorder(db, orderedIds);
}

export async function updateDay(
  db: SQLite.SQLiteDatabase,
  dayId: string,
  data: { dayType?: SplitDayType; seriesId?: string | null; label?: string | null }
): Promise<void> {
  return splitDayModel.update(db, dayId, data);
}

// --- Apply / clear ---

/** Add `days` to a YYYY-MM-DD date string (UTC-safe, no time component). */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * Schedule a split's workout days onto the agenda starting from `startDate`, repeated for
 * `cycles` passes. Rest days consume a calendar day but create no entry. All entries from
 * one call share an application_id so the batch can be cleared together. Returns how many
 * scheduled workouts were created.
 */
export async function applySplit(
  db: SQLite.SQLiteDatabase,
  splitId: string,
  startDate: string,
  cycles: number
): Promise<{ applicationId: string; scheduledCount: number }> {
  const days = await splitDayModel.getBySplit(db, splitId);
  const applicationId = Crypto.randomUUID();
  let offset = 0;
  let scheduledCount = 0;

  await db.withTransactionAsync(async () => {
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (const day of days) {
        if (day.dayType === 'workout' && day.seriesId) {
          await scheduledWorkoutModel.create(
            db,
            day.seriesId,
            addDays(startDate, offset),
            null,
            splitId,
            applicationId
          );
          scheduledCount++;
        }
        offset++;
      }
    }
  });

  return { applicationId, scheduledCount };
}

/** Remove a split's planned (not-yet-started) agenda entries. Started sessions are kept. */
export async function clearAppliedSplit(
  db: SQLite.SQLiteDatabase,
  splitId: string,
  applicationId?: string | null
): Promise<number> {
  return scheduledWorkoutModel.removeBySplit(db, splitId, applicationId);
}

// --- Series template preview (for split day detail) ---

interface TemplateSlotRow {
  slot_id: string;
  exercise_id: string;
  exercise_name: string;
  rest_seconds: number;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  rep_goal_type: string;
  notes: string | null;
}

interface TemplateAltRow {
  slot_id: string;
  exercise_id: string;
  exercise_name: string;
}

/**
 * Read-only view of a series' template: ordered slots with the primary exercise, its
 * prescription (sets/reps/rest), its note, and the alternative exercises. Powers the
 * split-day detail preview.
 */
export async function getSeriesTemplate(
  db: SQLite.SQLiteDatabase,
  seriesId: string,
  seriesName: string
): Promise<SeriesTemplate> {
  const slots = await db.getAllAsync<TemplateSlotRow>(
    `SELECT s.id AS slot_id, eo.exercise_id, e.name AS exercise_name,
            eo.rest_seconds, eo.target_sets, eo.target_reps_min, eo.target_reps_max,
            eo.rep_goal_type, n.notes AS notes
     FROM exercise_slots s
     JOIN exercise_options eo ON eo.slot_id = s.id AND eo.is_primary = 1
     JOIN exercises e ON e.id = eo.exercise_id
     LEFT JOIN exercise_option_notes n ON n.exercise_option_id = eo.id
     WHERE s.series_id = ?
     ORDER BY s.sort_order ASC`,
    seriesId
  );

  const alts = await db.getAllAsync<TemplateAltRow>(
    `SELECT eo.slot_id, eo.exercise_id, e.name AS exercise_name
     FROM exercise_slots s
     JOIN exercise_options eo ON eo.slot_id = s.id AND eo.is_primary = 0
     JOIN exercises e ON e.id = eo.exercise_id
     WHERE s.series_id = ?
     ORDER BY s.sort_order ASC, eo.created_at ASC`,
    seriesId
  );

  const altsBySlot = new Map<string, { exerciseId: string; exerciseName: string }[]>();
  for (const a of alts) {
    if (!altsBySlot.has(a.slot_id)) altsBySlot.set(a.slot_id, []);
    altsBySlot.get(a.slot_id)!.push({ exerciseId: a.exercise_id, exerciseName: a.exercise_name });
  }

  const exercises: SeriesTemplateExercise[] = slots.map((s) => ({
    slotId: s.slot_id,
    exerciseId: s.exercise_id,
    exerciseName: s.exercise_name,
    restSeconds: s.rest_seconds,
    targetSets: s.target_sets,
    targetRepsMin: s.target_reps_min,
    targetRepsMax: s.target_reps_max,
    repGoalType: (s.rep_goal_type as 'range' | 'amrap') ?? 'range',
    note: s.notes,
    alternatives: altsBySlot.get(s.slot_id) ?? [],
  }));

  return { seriesId, seriesName, exercises };
}
