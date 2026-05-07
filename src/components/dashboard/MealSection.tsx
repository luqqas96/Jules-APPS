
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
  const [editBaseMacros, setEditBaseMacros] = useState<{calories: number, protein: number, carbs: number, fats: number} | null>(null);
  const { dailyData, removeEntry, updateEntry } = useAppContext();
  const router = useRouter();

  const entries = dailyData.meals[mealType];
  const totalCalories = entries.reduce((acc, curr) => acc + curr.macros.calories, 0);

  const startEditing = (entry: FoodEntry) => {
    setEditingId(entry.id);
    setEditGrams(entry.grams || 100);
    if (entry.baseMacros) {
      setEditBaseMacros({...entry.baseMacros});
    } else {
      setEditBaseMacros(null);
    }
  };

  const saveEditing = (entry: FoodEntry) => {
    if (!editBaseMacros) {
      setEditingId(null);
      return;
    }

    const multiplier = editGrams / 100;
    const scaledMacros = {
      calories: Math.round(editBaseMacros.calories * multiplier),
      protein: Math.round(editBaseMacros.protein * multiplier),
      carbs: Math.round(editBaseMacros.carbs * multiplier),
      fats: Math.round(editBaseMacros.fats * multiplier),
    };

    const baseName = entry.name.replace(/\s*\(\d+g\)$/, '');
    const newName = editGrams !== 100 ? `${baseName} (${editGrams}g)` : baseName;

    updateEntry(mealType, entry.id, {
      name: newName,
      grams: editGrams,
      macros: scaledMacros,
      baseMacros: editBaseMacros
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


                    <div className="flex flex-col space-y-3 w-full">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium text-sm line-clamp-1 flex-1 pr-2">{entry.name.replace(/\s*\(\d+g\)$/, '')}</span>
                        <div className="flex space-x-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50" onClick={() => saveEditing(entry)}>
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-500 hover:bg-gray-100" onClick={() => setEditingId(null)}>
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-medium w-14">Gramos:</label>
                        <Input
                          type="number"
                          value={editGrams}
                          onChange={(e) => setEditGrams(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-20 h-8 text-sm px-2"
                        />
                      </div>

                      {editBaseMacros && (
                        <div className="bg-surface p-3 rounded-xl border border-surface-secondary shadow-sm mt-2">
                           <p className="text-[10px] text-muted-foreground mb-3 text-center uppercase tracking-wider font-semibold">Editar Valores Base (por 100g)</p>
                           <div className="grid grid-cols-4 gap-2">
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Kcal</label>
                               <Input type="number" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.calories} onChange={(e) => setEditBaseMacros({...editBaseMacros, calories: parseInt(e.target.value) || 0})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Prot(g)</label>
                               <Input type="number" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.protein} onChange={(e) => setEditBaseMacros({...editBaseMacros, protein: parseInt(e.target.value) || 0})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Carb(g)</label>
                               <Input type="number" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.carbs} onChange={(e) => setEditBaseMacros({...editBaseMacros, carbs: parseInt(e.target.value) || 0})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Gras(g)</label>
                               <Input type="number" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.fats} onChange={(e) => setEditBaseMacros({...editBaseMacros, fats: parseInt(e.target.value) || 0})} />
                             </div>
                           </div>
                        </div>
                      )}

                      {editBaseMacros && (
                        <p className="text-xs text-center text-muted-foreground mt-2 font-medium bg-surface-secondary/50 py-1.5 rounded-lg">
                          Vista previa: {Math.round(editBaseMacros.calories * (editGrams / 100))} kcal • P: {Math.round(editBaseMacros.protein * (editGrams / 100))}g
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
