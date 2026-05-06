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
}