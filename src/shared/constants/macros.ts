/** Macro display constants - colors and labels. Protein uses the app's primary accent (priority macro). */
export const MACRO_COLORS = {
  calories: 'rgb(250, 250, 250)', // headline / neutral
  protein: 'rgb(52, 211, 153)', // primary green — the priority macro
  carbs: 'rgb(96, 165, 250)', // blue
  fat: 'rgb(251, 146, 60)', // orange
} as const;

export const MACRO_OVER_COLOR = 'rgb(248, 113, 113)'; // red — over target

export const SERVING_UNITS: { label: string; value: 'g' | 'ml' | 'unit' }[] = [
  { label: 'g', value: 'g' },
  { label: 'ml', value: 'ml' },
  { label: 'unit', value: 'unit' },
];
