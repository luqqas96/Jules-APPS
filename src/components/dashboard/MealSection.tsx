"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { MealType } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MealSection({ mealType }: { mealType: MealType }) {
  const [expanded, setExpanded] = useState(false);
  const { dailyData, removeEntry } = useAppContext();
  const router = useRouter();

  const entries = dailyData.meals[mealType];
  const totalCalories = entries.reduce((acc, curr) => acc + curr.macros.calories, 0);

  return (
    <Card className="mb-4 overflow-hidden border-none shadow-sm bg-surface">
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-pixel-mint-light flex items-center justify-center text-pixel-mint">
            {/* Simple icon logic based on meal */}
            {mealType === "Desayuno" && "🌅"}
            {mealType === "Almuerzo" && "☀️"}
            {mealType === "Merienda" && "☕"}
            {mealType === "Cena" && "🌙"}
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">{mealType}</h3>
            <p className="text-sm text-muted-foreground">{Math.round(totalCalories)} kcal</p>
          </div>
        </div>
        <div>
          {expanded ? (
            <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-surface-secondary">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay alimentos registrados.</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {entries.map((entry) => (
                <li key={entry.id} className="flex justify-between items-center bg-surface-secondary p-3 rounded-2xl">
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-1">{entry.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Math.round(entry.macros.calories)} kcal • P: {Math.round(entry.macros.protein)}g • C: {Math.round(entry.macros.carbs)}g • G: {Math.round(entry.macros.fats)}g
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeEntry(mealType, entry.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            className="w-full rounded-full border-dashed"
            onClick={() => router.push(`/add?meal=${mealType}`)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Agregar a {mealType}
          </Button>
        </div>
      )}
    </Card>
  );
}