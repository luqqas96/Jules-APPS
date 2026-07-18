"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Droplet, Moon } from "lucide-react";
import { getTodayString } from "@/lib/utils";

export function MacroProgress() {
  const { macroGoals, dailyData, isLoaded, activeProfile } = useAppContext();
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Hidratación y descanso en localStorage
  useEffect(() => {
    setMounted(true);
    const todayStr = getTodayString();
    const savedWater = localStorage.getItem(`jules-water-${activeProfile}-${todayStr}`);
    const savedSleep = localStorage.getItem(`jules-sleep-${activeProfile}-${todayStr}`);

    setWater(savedWater ? parseInt(savedWater) : 0);
    setSleep(savedSleep ? parseFloat(savedSleep) : 0);
  }, [activeProfile]);

  const handleUpdateWater = (amount: number) => {
    const todayStr = getTodayString();
    const nextVal = Math.max(0, water + amount);
    setWater(nextVal);
    localStorage.setItem(`jules-water-${activeProfile}-${todayStr}`, nextVal.toString());
  };

  const handleUpdateSleep = (amount: number) => {
    const todayStr = getTodayString();
    const nextVal = Math.max(0, sleep + amount);
    setSleep(nextVal);
    localStorage.setItem(`jules-sleep-${activeProfile}-${todayStr}`, nextVal.toString());
  };

  if (!isLoaded || !mounted) {
    return <div className="h-[320px] animate-pulse bg-surface-secondary border border-border rounded-3xl mb-5" />;
  }

  // Totales
  const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  Object.values(dailyData.meals).forEach(mealEntries => {
    if (!Array.isArray(mealEntries)) return;
    mealEntries.forEach(entry => {
      if (!entry.macros) return;
      totals.calories += entry.macros.calories || 0;
      totals.protein += entry.macros.protein || 0;
      totals.carbs += entry.macros.carbs || 0;
      totals.fats += entry.macros.fats || 0;
    });
  });

  const totalCalories = Math.round(totals.calories);
  const calorieGoal = macroGoals.calories;
  const remainingCalories = Math.max(0, calorieGoal - totalCalories);

  // Anillo
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = calorieGoal > 0 ? Math.min(totalCalories / calorieGoal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progressPercent);

  const macroRows = [
    { label: "Proteína", value: totals.protein, goal: macroGoals.protein, color: "var(--color-pixel-mint)" },
    { label: "Carbohidratos", value: totals.carbs, goal: macroGoals.carbs, color: "var(--color-pixel-peach)" },
    { label: "Grasas", value: totals.fats, goal: macroGoals.fats, color: "var(--color-pixel-lavender)" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-5">

      {/* Anillo calórico */}
      <div className="md:col-span-5 bg-surface border border-border rounded-3xl p-6 flex flex-col items-center justify-between material-shadow">
        <div className="w-full flex items-center justify-between border-b border-border pb-3 mb-4">
          <span className="text-sm font-semibold text-foreground">Calorías de hoy</span>
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} stroke="var(--color-surface-secondary)" strokeWidth="8" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="var(--color-pixel-mint)"
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{remainingCalories}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">kcal restantes</span>
          </div>
        </div>

        <div className="w-full mt-4 bg-surface-secondary rounded-2xl p-2.5 text-center">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {totalCalories} <span className="text-muted-foreground font-normal">/ {calorieGoal} kcal</span>
          </span>
        </div>
      </div>

      {/* Macros + loggers */}
      <div className="md:col-span-7 bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between material-shadow">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <span className="text-sm font-semibold text-foreground">Macronutrientes</span>
          </div>

          {macroRows.map((m) => (
            <div key={m.label} className="space-y-1.5 mb-4 last:mb-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">{m.label}</span>
                <span className="text-muted-foreground font-medium tabular-nums">{Math.round(m.value)}g / {m.goal}g</span>
              </div>
              <div className="w-full h-2.5 bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${m.goal > 0 ? Math.min(100, (m.value / m.goal) * 100) : 0}%`, backgroundColor: m.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Loggers rápidos */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-surface-secondary rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span className="flex items-center space-x-1.5">
                <Droplet className="w-4 h-4 text-pixel-blue" />
                <span>Hidratación</span>
              </span>
              <span className="text-pixel-blue font-semibold tabular-nums">{water}ml</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleUpdateWater(250)}
                className="flex-1 py-1.5 rounded-xl bg-pixel-blue-light text-pixel-blue hover:brightness-95 transition-all text-xs font-semibold cursor-pointer"
              >
                +250ml
              </button>
              <button
                onClick={() => handleUpdateWater(500)}
                className="flex-1 py-1.5 rounded-xl bg-pixel-blue-light text-pixel-blue hover:brightness-95 transition-all text-xs font-semibold cursor-pointer"
              >
                +500ml
              </button>
            </div>
          </div>

          <div className="bg-surface-secondary rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span className="flex items-center space-x-1.5">
                <Moon className="w-4 h-4 text-pixel-lavender" />
                <span>Descanso</span>
              </span>
              <span className="text-pixel-lavender font-semibold tabular-nums">{sleep} h</span>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <button
                onClick={() => handleUpdateSleep(-0.5)}
                className="px-3 py-1.5 rounded-xl bg-surface text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer text-xs font-semibold"
              >
                −0.5h
              </button>
              <button
                onClick={() => handleUpdateSleep(0.5)}
                className="px-3 py-1.5 rounded-xl bg-surface text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer text-xs font-semibold"
              >
                +0.5h
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
