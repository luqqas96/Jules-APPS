import { MealType } from "@/types";

export const MEAL_TRANSLATIONS: Record<MealType, string> = {
  "Desayuno": "Breakfast",
  "Almuerzo": "Lunch",
  "Merienda": "Snack",
  "Cena": "Dinner"
};

export function getMealName(meal: MealType): string {
  return MEAL_TRANSLATIONS[meal] || meal;
}
