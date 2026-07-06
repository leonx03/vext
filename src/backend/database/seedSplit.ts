/**
 * Default split seed — the Revival Fitness 4-Day Upper/Lower routine.
 *
 * Builds four series (Upper A, Lower A, Upper B, Lower B) as first-class templates —
 * exercise slots with a primary option (prescribed sets/reps/rest), per-exercise notes, and
 * alternative options — then a default split that sequences them across a 7-day week
 * (Upper A, Lower A, Rest, Upper B, Lower B, Rest, Rest).
 *
 * Idempotent: returns early if a default split already exists. Runs after seedDatabase so the
 * exercise catalog exists; self-heals for upgraders (whose catalog seed is gated) by
 * INSERT OR IGNORE-ing any referenced exercise that is missing, using SEED_EXERCISES metadata.
 */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as splitModel from '@backend/models/split';
import * as splitDayModel from '@backend/models/splitDay';
import * as workoutSeriesModel from '@backend/models/workoutSeries';
import * as exerciseSlotModel from '@backend/models/exerciseSlot';
import * as exerciseOptionModel from '@backend/models/exerciseOption';
import * as exerciseOptionNoteModel from '@backend/models/exerciseOptionNote';
import { SEED_EXERCISES } from '@shared/constants/exercises';

const SPLIT_NAME = 'Revival Fitness 4-Day Upper/Lower';

interface SeedSlot {
  primary: string;
  alternatives: string[];
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  amrap?: boolean;
  restSeconds: number;
  note: string;
}

interface SeedDay {
  series: string;
  slots: SeedSlot[];
}

// Rest mapping: "3-5 minutes" -> 240, "~3 minutes" -> 180, "~2 minutes" -> 120.
const DAYS: SeedDay[] = [
  {
    series: 'Upper A',
    slots: [
      { primary: 'Overhead Press', alternatives: ['Dumbbell Shoulder Press', 'Incline Barbell Bench Press'], sets: 3, repsMin: 6, repsMax: 8, restSeconds: 240, note: 'BB OHP, standing or seated. 1-2 RIR. Lower bar to chin or collarbone each rep (keep consistent). Tuck elbows.' },
      { primary: 'Pull-Up', alternatives: ['Lat Pulldown'], sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180, note: '1 RIR. Extend arms fully and keep chest lifted. Use an assisted machine if needed.' },
      { primary: 'Barbell Bench Press', alternatives: ['Dumbbell Bench Press'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 180, note: '1 second pause each rep. 1-2 RIR. Modest low back arch. Don’t flare elbows. Lower bar just below the nipples.' },
      { primary: 'Dumbbell Lateral Raise', alternatives: ['Cable Lateral Raise'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Failure okay. Don’t turn pinkies up. Can be supersetted.' },
      { primary: 'Overhead Tricep Extension', alternatives: ['Skull Crusher'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'EZ handle or rope. Failure okay. Bend elbows as much as you can and go behind the head on the eccentric.' },
      { primary: 'Side Plank', alternatives: ['Russian Twist'], sets: 3, repsMin: null, repsMax: null, amrap: true, restSeconds: 120, note: 'Obliques, on forearm. AMRAP. Feet together, toes pointed up. If static holds are easy, switch to dynamic — up and down leading with the hip.' },
    ],
  },
  {
    series: 'Lower A',
    slots: [
      { primary: 'Barbell Deadlift', alternatives: ['Trap Bar Deadlift'], sets: 2, repsMin: 5, repsMax: null, restSeconds: 240, note: 'Conventional. 5+ reps. 1-2 RIR. Full resets between each rep, no touch-and-go. Ensure you are fully braced.' },
      { primary: 'Bulgarian Split Squat', alternatives: ['Dumbbell Reverse Lunge'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 180, note: 'DBs in both hands. 1-2 RIR. Don’t bounce knees or DBs off the ground. Use the same height box/bench. Can use one arm for balance.' },
      { primary: 'Barbell Bent-Over Row', alternatives: ['Dumbbell Single-Arm Row', 'Seated Cable Row'], sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180, note: '1 RIR. Extend arms fully and let scapulae loosen on the eccentric. Hips stay back.' },
      { primary: 'Seated Leg Curl', alternatives: ['Lying Leg Curl'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Seated hamstring curl machine. Failure okay. Extend legs fully, keep toes pointed up, back against the pad.' },
      { primary: 'Dumbbell Curl', alternatives: ['Barbell Curl', 'Hammer Curl'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Standing or seated. Failure okay. Extend arms fully. Keep palms up for the entire set. Can be supersetted.' },
      { primary: 'Standing Calf Raise', alternatives: ['Seated Calf Raise'], sets: 3, repsMin: 12, repsMax: 16, restSeconds: 120, note: 'Machine. Stand so the heels are off the pad to get a deep stretch.' },
    ],
  },
  {
    series: 'Upper B',
    slots: [
      { primary: 'Barbell Bench Press', alternatives: ['Close-Grip Bench Press'], sets: 3, repsMin: 5, repsMax: null, restSeconds: 240, note: '1 second pause each rep. 5+ reps. 1-2 RIR. Modest low back arch. Don’t flare elbows. Lower bar just below the nipples.' },
      { primary: 'Chin-Up', alternatives: ['Lat Pulldown'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 180, note: '1 RIR. Extend arms fully and keep chest lifted. Use an assisted machine if needed.' },
      { primary: 'Incline Dumbbell Press', alternatives: ['Incline Barbell Bench Press'], sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180, note: '30-45°. 1 RIR. Lower DBs to chest each rep. Don’t flare elbows.' },
      { primary: 'Pec Deck', alternatives: ['Dumbbell Fly', 'Cable Crossover'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 180, note: 'Failure okay. Adjust seat so handles are mid-chest height.' },
      { primary: 'Face Pull', alternatives: ['Dumbbell Reverse Fly'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Cable, standing, pulley at chest. Failure okay. Pull elbows back, up, and out a bit. Take a staggered stance. Can be supersetted.' },
      { primary: 'Cable Crunch', alternatives: ['Hanging Leg Raise', 'Ab Wheel Rollout'], sets: 3, repsMin: 12, repsMax: 16, restSeconds: 120, note: 'Center abs, kneeling. Use rope, V, or U handle and hold over the head. Bow down leading with the stomach.' },
    ],
  },
  {
    series: 'Lower B',
    slots: [
      { primary: 'Barbell Squat', alternatives: ['Front Squat'], sets: 3, repsMin: 5, repsMax: null, restSeconds: 240, note: 'Back squat. 5+ reps. 1-2 RIR. Keep depth consistent (parallel or below). High bar recommended.' },
      { primary: 'Romanian Deadlift', alternatives: ['Good Morning'], sets: 3, repsMin: 6, repsMax: 8, restSeconds: 180, note: 'BB RDL. 1-2 RIR. Slight knee bend — not the same as stiff-legged.' },
      { primary: 'Leg Press', alternatives: ['Hack Squat'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 180, note: 'Large, plate loaded. 1-2 RIR. Medium foot width. Lower as far as you can without low back rounding. Slight knee bend on lockout.' },
      { primary: 'Inverted Row', alternatives: ['Seated Cable Row'], sets: 3, repsMin: null, repsMax: null, amrap: true, restSeconds: 180, note: 'Bar in rack, Smith machine, or TRX. AMRAP. Failure okay. Extend arms fully. Chest up, legs straight. Don’t flare elbows. Once 3x12 is easy, switch to an alternate exercise.' },
      { primary: 'Preacher Curl', alternatives: ['Cable Bicep Curl'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Machine. Failure okay. Extend arms fully. Don’t use momentum.' },
      { primary: 'Standing Calf Raise', alternatives: ['Seated Calf Raise'], sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120, note: 'Machine. Drop set each set. Heels off the pad to get a deep stretch.' },
    ],
  },
];

// 7-day week: workout, workout, rest, workout, workout, rest, rest.
const SPLIT_DAY_SERIES: (string | null)[] = ['Upper A', 'Lower A', null, 'Upper B', 'Lower B', null, null];

/** Ensure every exercise referenced by the routine exists, then return a name -> id map. */
async function ensureExercises(db: SQLite.SQLiteDatabase): Promise<Map<string, string>> {
  const names = new Set<string>();
  for (const day of DAYS) {
    for (const slot of day.slots) {
      names.add(slot.primary);
      for (const alt of slot.alternatives) names.add(alt);
    }
  }

  const seedByName = new Map(SEED_EXERCISES.map((e) => [e.name.toLowerCase(), e]));

  for (const name of names) {
    const seed = seedByName.get(name.toLowerCase());
    if (!seed) {
      // Should never happen — every referenced name is in SEED_EXERCISES.
      if (__DEV__) console.warn(`[seedSplit] referenced exercise not in catalog: ${name}`);
      continue;
    }
    await db.runAsync(
      `INSERT OR IGNORE INTO exercises (id, name, category, primary_muscles, equipment, instructions, tracking_type, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      Crypto.randomUUID(),
      seed.name,
      seed.category,
      JSON.stringify(seed.primaryMuscles),
      seed.equipment,
      seed.instructions,
      seed.trackingType ?? 'weighted'
    );
  }

  const rows = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM exercises`
  );
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.name.toLowerCase(), r.id);
  return map;
}

export async function seedDefaultSplit(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await splitModel.getDefault(db);
  if (existing) return;

  const exerciseIds = await ensureExercises(db);
  const resolve = (name: string): string | null => exerciseIds.get(name.toLowerCase()) ?? null;

  await db.withTransactionAsync(async () => {
    const seriesIdByName = new Map<string, string>();

    // Build each series as a template: slots -> primary option (+ note) + alternative options.
    for (const day of DAYS) {
      const series = await workoutSeriesModel.create(db, day.series);
      seriesIdByName.set(day.series, series.id);

      for (let i = 0; i < day.slots.length; i++) {
        const slot = day.slots[i];
        const primaryId = resolve(slot.primary);
        if (!primaryId) continue;

        const slotId = Crypto.randomUUID();
        await exerciseSlotModel.create(db, slotId, series.id, i);
        const repGoalType: 'range' | 'amrap' = slot.amrap ? 'amrap' : 'range';

        const primaryOption = await exerciseOptionModel.create(
          db, slotId, primaryId, true, slot.restSeconds, slot.repsMin, slot.repsMax, slot.sets, repGoalType
        );
        await exerciseOptionNoteModel.setNote(db, primaryOption.id, slot.note);

        for (const altName of slot.alternatives) {
          const altId = resolve(altName);
          if (!altId || altId === primaryId) continue;
          await exerciseOptionModel.create(
            db, slotId, altId, false, slot.restSeconds, slot.repsMin, slot.repsMax, slot.sets, repGoalType
          );
        }
      }
    }

    // Create the split and its ordered days.
    const split = await splitModel.create(
      db,
      SPLIT_NAME,
      '4-day Upper/Lower by Revival Fitness. One week per cycle.',
      true
    );
    for (const seriesName of SPLIT_DAY_SERIES) {
      if (seriesName) {
        await splitDayModel.create(db, split.id, 'workout', seriesIdByName.get(seriesName) ?? null);
      } else {
        await splitDayModel.create(db, split.id, 'rest');
      }
    }
  });
}
