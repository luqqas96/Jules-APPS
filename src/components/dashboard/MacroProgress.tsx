"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Sparkles, Droplet, Moon, Barcode, Sliders } from "lucide-react";
import { getTodayString } from "@/lib/utils";

export function MacroProgress() {
  const { macroGoals, dailyData, isLoaded, activeProfile } = useAppContext();
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Sync hydration & sleep with localStorage
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
    return <div className="h-[340px] animate-pulse bg-white/[0.03] border border-white/5 rounded-[2rem]" />;
  }

  // Calculate totals
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

  // Circle stroke math
  const strokeDasharray = 282.7;
  const progressPercent = calorieGoal > 0 ? Math.min(totalCalories / calorieGoal, 1) : 0;
  const strokeDashoffset = strokeDasharray * (1 - progressPercent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
      
      {/* Left Bento: SVG Circular Ring */}
      <div className="md:col-span-5 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-between min-h-[300px] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
        
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2 mb-4 relative z-10">
          <span className="font-display font-black text-xs uppercase tracking-[0.15em] text-blue-400">
            Análisis Calórico
          </span>
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Calorías Hoy</span>
          </div>
        </div>

        {/* Ring SVG circle */}
        <div className="relative w-40 h-40 flex items-center justify-center z-10">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              stroke="currentColor" 
              strokeWidth="6" 
              fill="transparent" 
              strokeDasharray={strokeDasharray} 
              strokeDashoffset={strokeDashoffset} 
              className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-700 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white tracking-tight">{remainingCalories}</span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-0.5">Kcal Restantes</span>
          </div>
        </div>

        <div className="w-full mt-4 bg-white/5 border border-white/5 rounded-2xl p-2.5 text-center relative z-10">
          <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">
            {totalCalories} kcal / {calorieGoal} meta
          </span>
        </div>
      </div>

      {/* Right Bento: Macros & Logging widgets */}
      <div className="md:col-span-7 bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
            <span className="font-display font-black text-xs uppercase tracking-[0.15em] text-slate-200">
              Macronutrientes del Día
            </span>
          </div>

          {/* Protein */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-blue-400 font-bold uppercase tracking-wider">Proteína</span>
              <span className="text-slate-300 font-bold">{Math.round(totals.protein)}g / {macroGoals.protein}g</span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                style={{ width: `${Math.min(100, (totals.protein / macroGoals.protein) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Carbohidratos</span>
              <span className="text-slate-300 font-bold">{Math.round(totals.carbs)}g / {macroGoals.carbs}g</span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                style={{ width: `${Math.min(100, (totals.carbs / macroGoals.carbs) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="space-y-1.5 mb-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-400 font-bold uppercase tracking-wider">Grasas</span>
              <span className="text-slate-300 font-bold">{Math.round(totals.fats)}g / {macroGoals.fats}g</span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]" 
                style={{ width: `${Math.min(100, (totals.fats / macroGoals.fats) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Loggers */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          
          {/* Water logger */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Hidratación</span>
              </span>
              <span className="text-cyan-400 font-bold">{water}ml</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleUpdateWater(250)}
                className="flex-1 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-mono text-[10px] font-bold cursor-pointer"
              >
                +250ml
              </button>
              <button
                onClick={() => handleUpdateWater(500)}
                className="flex-1 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-mono text-[10px] font-bold cursor-pointer"
              >
                +500ml
              </button>
            </div>
          </div>

          {/* Sleep logger */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Descanso</span>
              </span>
              <span className="text-indigo-400 font-bold">{sleep} hs</span>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <button
                onClick={() => handleUpdateSleep(-0.5)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer text-xs font-bold"
              >
                -0.5h
              </button>
              <span className="text-xs font-semibold text-slate-200">{sleep} hs</span>
              <button
                onClick={() => handleUpdateSleep(0.5)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer text-xs font-bold"
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