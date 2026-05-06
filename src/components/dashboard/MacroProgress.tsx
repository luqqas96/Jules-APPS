"use client";

import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

export function MacroProgress() {
  const { macroGoals, dailyData, isLoaded } = useAppContext();

  if (!isLoaded) return <div className="h-48 animate-pulse bg-surface-secondary rounded-[1.5rem]" />;

  // Calculate totals
  const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  Object.values(dailyData.meals).forEach(mealEntries => {
    mealEntries.forEach(entry => {
      totals.calories += entry.macros.calories;
      totals.protein += entry.macros.protein;
      totals.carbs += entry.macros.carbs;
      totals.fats += entry.macros.fats;
    });
  });

  return (
    <Card className="bg-surface shadow-sm mb-6 border-none">
      <CardContent className="p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Calorías Totales</p>
            <h2 className="text-3xl font-bold tracking-tight">
              {Math.round(totals.calories)} <span className="text-base font-normal text-muted-foreground">/ {macroGoals.calories} kcal</span>
            </h2>
          </div>
        </div>
        <ProgressBar value={totals.calories} max={macroGoals.calories} className="mb-6 h-3" colorClass="bg-pixel-mint" />

        <div className="grid grid-cols-3 gap-4">
          {/* Protein */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Proteínas</span>
              <span className="text-muted-foreground">{Math.round(totals.protein)}/{macroGoals.protein}g</span>
            </div>
            <ProgressBar value={totals.protein} max={macroGoals.protein} className="h-2" colorClass="bg-pixel-peach" />
          </div>

          {/* Carbs */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Carbos</span>
              <span className="text-muted-foreground">{Math.round(totals.carbs)}/{macroGoals.carbs}g</span>
            </div>
            <ProgressBar value={totals.carbs} max={macroGoals.carbs} className="h-2" colorClass="bg-pixel-blue" />
          </div>

          {/* Fats */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Grasas</span>
              <span className="text-muted-foreground">{Math.round(totals.fats)}/{macroGoals.fats}g</span>
            </div>
            <ProgressBar value={totals.fats} max={macroGoals.fats} className="h-2" colorClass="bg-pixel-lavender" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}