"use client";
import { getMealName } from "@/lib/translations";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, DocumentDuplicateIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { MealType, FoodEntry } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MealSection({ mealType }: { mealType: MealType }) {
  const [expanded, setExpanded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState<string>("0");
  const [editTime, setEditTime] = useState<string>("");
  const [editBaseMacros, setEditBaseMacros] = useState<{calories: string, protein: string, carbs: string, fats: string} | null>(null);
  const { dailyData, addEntry, removeEntry, moveEntry: contextMoveEntry, updateEntry } = useAppContext();
  const router = useRouter();

  const entries = dailyData.meals[mealType] || [];
  const totalCalories = entries.reduce((acc, curr) => acc + (curr.macros?.calories || 0), 0);

  const startEditing = (entry: FoodEntry) => {
    setEditingId(entry.id);
    setEditGrams((entry.grams || 100).toString());
    if (entry.timestamp) {
      const d = new Date(entry.timestamp);
      setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setEditTime("");
    }
    if (entry.baseMacros) {
      setEditBaseMacros({
        calories: entry.baseMacros.calories.toString(),
        protein: entry.baseMacros.protein.toString(),
        carbs: entry.baseMacros.carbs.toString(),
        fats: entry.baseMacros.fats.toString()
      });
    } else {
      setEditBaseMacros(null);
    }
  };

  const saveEditing = (entry: FoodEntry) => {
    if (!editBaseMacros) {
      setEditingId(null);
      return;
    }

    const parsedGrams = parseFloat(editGrams) || 0;
    const multiplier = parsedGrams / 100;

    const parsedBase = {
      calories: parseFloat(editBaseMacros.calories) || 0,
      protein: parseFloat(editBaseMacros.protein) || 0,
      carbs: parseFloat(editBaseMacros.carbs) || 0,
      fats: parseFloat(editBaseMacros.fats) || 0
    };

    const scaledMacros = {
      calories: Math.round(parsedBase.calories * multiplier),
      protein: Number((parsedBase.protein * multiplier).toFixed(1)),
      carbs: Number((parsedBase.carbs * multiplier).toFixed(1)),
      fats: Number((parsedBase.fats * multiplier).toFixed(1)),
    };

    const baseName = entry.name.replace(/\s*\([\d\.]+g\)$/, '');
    const newName = parsedGrams !== 100 ? `${baseName} (${parsedGrams}g)` : baseName;

    let newTimestamp = entry.timestamp;
    if (editTime && editTime.includes(':')) {
       const [hh, mm] = editTime.split(':');
       const d = new Date(entry.timestamp || Date.now());
       d.setHours(parseInt(hh, 10));
       d.setMinutes(parseInt(mm, 10));
       newTimestamp = d.getTime();
    }

    updateEntry(mealType, entry.id, {
      name: newName,
      grams: parsedGrams,
      macros: scaledMacros,
      baseMacros: parsedBase,
      timestamp: newTimestamp
    });
    setEditingId(null);
  };

  const duplicateEntry = (entry: FoodEntry) => {
    const newEntry = { ...entry };
    addEntry(mealType, {
      name: newEntry.name,
      grams: newEntry.grams,
      macros: { ...newEntry.macros },
      baseMacros: newEntry.baseMacros ? { ...newEntry.baseMacros } : { calories: 0, protein: 0, carbs: 0, fats: 0 }
    });
  };


  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const moveEntry = (entry: FoodEntry, targetMeal: MealType) => {
    if (targetMeal === mealType) return;
    contextMoveEntry(mealType, targetMeal, entry.id);
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
            <h3 className="font-semibold text-lg leading-tight">{getMealName(mealType)}</h3>
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
            <p className="text-sm text-muted-foreground text-center py-4">No food logged yet.</p>
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
                        <label className="text-xs font-medium w-14">Time:</label>
                        <Input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-24 h-8 text-sm px-2"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-medium w-14">Grams:</label>
                        <Input
                          type="number"
                          value={editGrams}
                          onChange={(e) => setEditGrams(e.target.value)}
                          className="w-20 h-8 text-sm px-2"
                        />
                      </div>

                      {editBaseMacros && (
                        <div className="bg-surface p-3 rounded-xl border border-surface-secondary shadow-sm mt-2">
                           <p className="text-[10px] text-muted-foreground mb-3 text-center uppercase tracking-wider font-semibold">Edit Base Values (per 100g)</p>
                           <div className="grid grid-cols-4 gap-2">
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Kcal</label>
                               <Input type="number" step="0.1" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.calories} onChange={(e) => setEditBaseMacros({...editBaseMacros, calories: e.target.value})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Prot(g)</label>
                               <Input type="number" step="0.1" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.protein} onChange={(e) => setEditBaseMacros({...editBaseMacros, protein: e.target.value})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Carb(g)</label>
                               <Input type="number" step="0.1" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.carbs} onChange={(e) => setEditBaseMacros({...editBaseMacros, carbs: e.target.value})} />
                             </div>
                             <div className="flex flex-col items-center">
                               <label className="text-[10px] text-muted-foreground mb-1">Fat(g)</label>
                               <Input type="number" step="0.1" className="h-8 text-xs px-1 text-center font-medium" value={editBaseMacros.fats} onChange={(e) => setEditBaseMacros({...editBaseMacros, fats: e.target.value})} />
                             </div>
                           </div>
                        </div>
                      )}

                      {editBaseMacros && (
                        <p className="text-xs text-center text-muted-foreground mt-2 font-medium bg-surface-secondary/50 py-1.5 rounded-lg">
                          Preview: {Math.round((parseFloat(editBaseMacros.calories)||0) * ((parseFloat(editGrams)||0) / 100))} kcal • P: {((parseFloat(editBaseMacros.protein)||0) * ((parseFloat(editGrams)||0) / 100)).toFixed(1)}g
                        </p>
                      )}
                    </div>


                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2"><p className="font-medium text-sm line-clamp-1">{entry.name}</p><span className="text-xs text-muted-foreground whitespace-nowrap bg-surface-secondary px-1.5 py-0.5 rounded">{formatTime(entry.timestamp)}</span></div>
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
                          className="h-8 w-8 text-blue-400 hover:text-blue-500 hover:bg-blue-50"
                          onClick={(e) => { e.stopPropagation(); duplicateEntry(entry); }}
                          title="Duplicar"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </Button>
                        <select
                          className="h-8 w-8 text-purple-400 bg-transparent hover:text-purple-500 hover:bg-purple-50 appearance-none cursor-pointer text-center text-xs ml-1"
                          onChange={(e) => moveEntry(entry, e.target.value as MealType)}
                          value=""
                          title="Mover a otra comida"
                        >
                          <option value="" disabled>➡️</option>
                          {["Desayuno", "Almuerzo", "Merienda", "Cena"].filter(m => m !== mealType).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
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
            Add to {getMealName(mealType)}
          </Button>
        </div>
      )}
    </Card>
  );
}
