export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  cholesterol?: number;
  sodium?: number;
  sugar?: number;
  calcium?: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  macros: Macros;
  baseMacros: Macros; // The macros per 100g (or the base unit)
  grams: number;      // The amount of grams the user consumed
  timestamp: number;
}

export type UserProfile = "Lucas" | "Agustin" | "Mariano";

export type MealType = "Desayuno" | "Almuerzo" | "Merienda" | "Cena";

export interface MealData {
  type: MealType;
  entries: FoodEntry[];
}

export interface DailyData {
  date: string;
  meals: Record<MealType, FoodEntry[]>;
  weight?: { value: number, date: string } | null;
}

export interface UserStats {
  gender: "Masculino" | "Femenino";
  age: number;
  weight: number;
  height: number;
  activityLevel: "Sedentario" | "Ligero" | "Moderado" | "Activo" | "Muy Activo";
  goal: "Perder peso" | "Mantener peso" | "Ganar masa muscular";
  goalOffset?: number;
}
