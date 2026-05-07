
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { MealType, FoodEntry } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MealSection({ mealType }: { mealType: MealType }) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState<number>(0);
  const { dailyData, removeEntry, updateEntry } = useAppContext();
  const router = useRouter();

  const entries = dailyData.meals[mealType];
  const totalCalories = entries.reduce((acc, curr) => acc + curr.macros.calories, 0);

  const startEditing = (entry: FoodEntry) => {
    setEditingId(entry.id);
    // If it has baseMacros, it was added with the new structure.
    // If not, we assume it's legacy and editing grams is not supported or we default to 100g.
    setEditGrams(entry.grams || 100);
  };

  const saveEditing = (entry: FoodEntry) => {
    if (!entry.baseMacros) {
      setEditingId(null);
      return; // Cannot edit legacy entries easily without original macros
    }

    const multiplier = editGrams / 100;
    const scaledMacros = {
      calories: Math.round(entry.baseMacros.calories * multiplier),
      protein: Math.round(entry.baseMacros.protein * multiplier),
      carbs: Math.round(entry.baseMacros.carbs * multiplier),
      fats: Math.round(entry.baseMacros.fats * multiplier),
    };

    // Attempt to update the name to reflect new grams if it was previously set.
    // Remove old (Xg) suffix if it exists and add new one.
    const baseName = entry.name.replace(/\s*\(\d+g\)$/, '');
    const newName = editGrams !== 100 ? `${baseName} (${editGrams}g)` : baseName;

    updateEntry(mealType, entry.id, {
      name: newName,
      grams: editGrams,
      macros: scaledMacros
    });
    setEditingId(null);
  };

  return (
    <Card className="mb-4 overflow-hidden border-none shadow-sm bg-surface">
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => { if (!editingId) setExpanded(!expanded); }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-pixel-mint-light flex items-center justify-center text-pixel-mint">
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
                <li key={entry.id} className="flex flex-col bg-surface-secondary p-3 rounded-2xl">
                  {editingId === entry.id ? (
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm line-clamp-1 flex-1">{entry.name.replace(/\s*\(\d+g\)$/, '')}</span>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => saveEditing(entry)}>
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setEditingId(null)}>
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editGrams}
                          onChange={(e) => setEditGrams(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-20 h-8 text-sm px-2"
                        />
                        <span className="text-sm text-muted-foreground">g</span>
                      </div>
                      {entry.baseMacros && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Preview: {Math.round(entry.baseMacros.calories * (editGrams / 100))} kcal • P: {Math.round(entry.baseMacros.protein * (editGrams / 100))}g
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{entry.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Math.round(entry.macros.calories)} kcal • P: {Math.round(entry.macros.protein)}g • C: {Math.round(entry.macros.carbs)}g • G: {Math.round(entry.macros.fats)}g
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        {entry.baseMacros && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            onClick={(e) => { e.stopPropagation(); startEditing(entry); }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); removeEntry(mealType, entry.id); }}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
