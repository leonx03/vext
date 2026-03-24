/** Default exercises - seed data for the built-in exercise library. */
import { ExerciseCategory, MuscleGroup, Equipment, type ExerciseSeed } from '@shared/types/exercise';

export const SEED_EXERCISES: ExerciseSeed[] = [
  // === CHEST (Strength) ===
  { name: 'Barbell Bench Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Barbell, instructions: 'Lie on a flat bench, grip the bar slightly wider than shoulder-width, lower to chest, press up.' },
  { name: 'Incline Barbell Bench Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Barbell, instructions: 'Set bench to 30-45 degrees. Lower bar to upper chest, press up.' },
  { name: 'Dumbbell Bench Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Dumbbell, instructions: 'Lie on a flat bench with dumbbells, press up from chest level.' },
  { name: 'Dumbbell Fly', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Dumbbell, instructions: 'Lie on a flat bench, arms extended, lower dumbbells in a wide arc, squeeze back up.' },
  { name: 'Cable Crossover', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Cable, instructions: 'Set cables high, step forward, bring handles together in front of chest.' },
  { name: 'Push-Up', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Bodyweight, instructions: 'Hands shoulder-width apart, lower chest to ground, push up.' },
  { name: 'Chest Press Machine', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.Machine, instructions: 'Sit upright, grip handles at chest height, press forward, return slowly.' },

  // === BACK (Strength) ===
  { name: 'Barbell Deadlift', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back, MuscleGroup.Hamstrings, MuscleGroup.Glutes], equipment: Equipment.Barbell, instructions: 'Stand with feet hip-width, grip bar, drive through heels, extend hips and knees.' },
  { name: 'Barbell Bent-Over Row', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back], equipment: Equipment.Barbell, instructions: 'Hinge at hips, grip bar, pull to lower chest, lower with control.' },
  { name: 'Pull-Up', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back], equipment: Equipment.Bodyweight, instructions: 'Hang from bar, pull chin above bar, lower with control.' },
  { name: 'Lat Pulldown', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back], equipment: Equipment.Cable, instructions: 'Grip wide bar, pull down to upper chest, squeeze shoulder blades together.' },
  { name: 'Seated Cable Row', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back], equipment: Equipment.Cable, instructions: 'Sit upright, pull handle to torso, squeeze shoulder blades, return slowly.' },
  { name: 'Dumbbell Single-Arm Row', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Back], equipment: Equipment.Dumbbell, instructions: 'One knee on bench, pull dumbbell to hip, lower with control.' },

  // === SHOULDERS (Strength) ===
  { name: 'Overhead Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.FrontDelt], equipment: Equipment.Barbell, instructions: 'Stand with bar at shoulder height, press overhead, lower with control.' },
  { name: 'Dumbbell Lateral Raise', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.SideDelt], equipment: Equipment.Dumbbell, instructions: 'Stand with dumbbells at sides, raise arms to shoulder height, lower slowly.' },
  { name: 'Dumbbell Shoulder Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.FrontDelt], equipment: Equipment.Dumbbell, instructions: 'Sit or stand, press dumbbells from shoulder height overhead.' },
  { name: 'Face Pull', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.RearDelt], equipment: Equipment.Cable, instructions: 'Set cable at face height, pull rope to face with elbows high, squeeze rear delts.' },
  { name: 'Dumbbell Front Raise', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.FrontDelt], equipment: Equipment.Dumbbell, instructions: 'Stand with dumbbells in front of thighs, raise one or both arms to shoulder height.' },

  // === BICEPS (Strength) ===
  { name: 'Barbell Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Biceps], equipment: Equipment.Barbell, instructions: 'Stand with bar at arm length, curl to shoulders keeping elbows stationary.' },
  { name: 'Dumbbell Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Biceps], equipment: Equipment.Dumbbell, instructions: 'Stand or sit with dumbbells, curl to shoulders, lower with control.' },
  { name: 'Hammer Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Biceps], equipment: Equipment.Dumbbell, instructions: 'Hold dumbbells with neutral grip (palms facing in), curl to shoulders.' },
  { name: 'Cable Bicep Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Biceps], equipment: Equipment.Cable, instructions: 'Stand facing cable, grip bar, curl up keeping elbows at sides.' },

  // === TRICEPS (Strength) ===
  { name: 'Tricep Pushdown', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Triceps], equipment: Equipment.Cable, instructions: 'Stand facing cable, grip bar or rope, push down extending elbows fully.' },
  { name: 'Overhead Tricep Extension', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Triceps], equipment: Equipment.Dumbbell, instructions: 'Hold dumbbell overhead with both hands, lower behind head, extend back up.' },
  { name: 'Dip', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Triceps], equipment: Equipment.Bodyweight, instructions: 'Grip parallel bars, lower body by bending elbows, push back up.' },
  { name: 'Close-Grip Bench Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Triceps], equipment: Equipment.Barbell, instructions: 'Lie on bench, grip bar with hands close together, lower to chest, press up.' },

  // === QUADS (Strength) ===
  { name: 'Barbell Squat', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes], equipment: Equipment.Barbell, instructions: 'Bar on upper back, feet shoulder-width, squat until thighs are parallel, stand up.' },
  { name: 'Leg Press', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes], equipment: Equipment.Machine, instructions: 'Sit in machine, feet shoulder-width on platform, press up, lower with control.' },
  { name: 'Leg Extension', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Quads], equipment: Equipment.Machine, instructions: 'Sit in machine, extend legs until straight, lower slowly.' },
  { name: 'Bulgarian Split Squat', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes], equipment: Equipment.Dumbbell, instructions: 'Rear foot on bench, lower into lunge until front thigh is parallel, push up.' },
  { name: 'Goblet Squat', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes], equipment: Equipment.Dumbbell, instructions: 'Hold dumbbell at chest, squat until thighs parallel, stand up.' },

  // === HAMSTRINGS (Strength) ===
  { name: 'Romanian Deadlift', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Hamstrings, MuscleGroup.Glutes], equipment: Equipment.Barbell, instructions: 'Hold bar at hip level, hinge forward keeping legs nearly straight, return to standing.' },
  { name: 'Lying Leg Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Hamstrings], equipment: Equipment.Machine, instructions: 'Lie face down on machine, curl heels toward glutes, lower slowly.' },
  { name: 'Seated Leg Curl', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Hamstrings], equipment: Equipment.Machine, instructions: 'Sit in machine, curl legs back, return slowly.' },

  // === GLUTES (Strength) ===
  { name: 'Hip Thrust', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Glutes, MuscleGroup.Hamstrings], equipment: Equipment.Barbell, instructions: 'Upper back on bench, bar on hips, drive hips up squeezing glutes, lower slowly.' },
  { name: 'Cable Kickback', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Glutes], equipment: Equipment.Cable, instructions: 'Attach ankle strap to low cable, kick leg back squeezing glute, return slowly.' },

  // === CALVES (Strength) ===
  { name: 'Standing Calf Raise', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Calves], equipment: Equipment.Machine, instructions: 'Stand on calf raise machine, rise up on toes, lower slowly below platform level.' },
  { name: 'Seated Calf Raise', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Calves], equipment: Equipment.Machine, instructions: 'Sit in machine, rise up on toes, lower slowly.' },

  // === CORE (Strength) ===
  { name: 'Plank', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Core], equipment: Equipment.Bodyweight, instructions: 'Forearms and toes on ground, keep body straight, hold position.' },
  { name: 'Hanging Leg Raise', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Core], equipment: Equipment.Bodyweight, instructions: 'Hang from bar, raise legs to parallel or higher, lower with control.' },
  { name: 'Cable Crunch', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Core], equipment: Equipment.Cable, instructions: 'Kneel facing cable, hold rope behind head, crunch down contracting abs.' },
  { name: 'Ab Wheel Rollout', category: ExerciseCategory.Strength, primaryMuscles: [MuscleGroup.Core], equipment: Equipment.None, instructions: 'Kneel with ab wheel, roll forward extending body, pull back using core.' },

  // === CARDIO ===
  { name: 'Treadmill Running', category: ExerciseCategory.Cardio, primaryMuscles: [MuscleGroup.FullBody], equipment: Equipment.CardioMachine, instructions: 'Set speed and incline. Maintain steady pace or follow interval program.' },
  { name: 'Stationary Bike', category: ExerciseCategory.Cardio, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Hamstrings], equipment: Equipment.CardioMachine, instructions: 'Adjust seat height, pedal at desired resistance and cadence.' },
  { name: 'Rowing Machine', category: ExerciseCategory.Cardio, primaryMuscles: [MuscleGroup.FullBody], equipment: Equipment.CardioMachine, instructions: 'Drive with legs, lean back slightly, pull handle to chest. Return in reverse order.' },
  { name: 'Elliptical', category: ExerciseCategory.Cardio, primaryMuscles: [MuscleGroup.FullBody], equipment: Equipment.CardioMachine, instructions: 'Step on pedals, move in smooth elliptical motion, use handles for upper body.' },
  { name: 'Jump Rope', category: ExerciseCategory.Cardio, primaryMuscles: [MuscleGroup.FullBody, MuscleGroup.Calves], equipment: Equipment.None, instructions: 'Swing rope overhead, jump with both feet, maintain light bouncing rhythm.' },

  // === FLEXIBILITY ===
  { name: 'Standing Hamstring Stretch', category: ExerciseCategory.Flexibility, primaryMuscles: [MuscleGroup.Hamstrings], equipment: Equipment.None, instructions: 'Stand and place one heel on elevated surface, lean forward keeping back straight.' },
  { name: 'Hip Flexor Stretch', category: ExerciseCategory.Flexibility, primaryMuscles: [MuscleGroup.Quads, MuscleGroup.Glutes], equipment: Equipment.None, instructions: 'Kneel on one knee, push hips forward until you feel a stretch in the front of your hip.' },
  { name: 'Chest Doorway Stretch', category: ExerciseCategory.Flexibility, primaryMuscles: [MuscleGroup.Chest], equipment: Equipment.None, instructions: 'Place forearm on doorframe, step through until you feel a chest stretch. Hold.' },
  { name: 'Cat-Cow Stretch', category: ExerciseCategory.Flexibility, primaryMuscles: [MuscleGroup.Back, MuscleGroup.Core], equipment: Equipment.None, instructions: 'On hands and knees, alternate between arching back (cow) and rounding back (cat).' },
];
