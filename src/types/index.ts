export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  macros: Macros;
  baseMacros: Macros; // The macros per 100g (or the base unit)
  grams: number;      // The amount of grams the user consumed
  timestamp: number;
}

export type MealType = "Desayuno" | "Almuerzo" | "Merienda" | "Cena";

export interface MealData {
  type: MealType;
  entries: FoodEntry[];
}

export interface DailyData {
  date: string;
  meals: Record<MealType, FoodEntry[]>;
  weight?: number | null;
}
