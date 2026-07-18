import { MealType } from "@/types";

export const MEAL_TRANSLATIONS: Record<MealType, string> = {
  "Desayuno": "Desayuno",
  "Almuerzo": "Almuerzo",
  "Merienda": "Merienda",
  "Cena": "Cena"
};

export function getMealName(meal: MealType): string {
  return MEAL_TRANSLATIONS[meal] || meal;
}
