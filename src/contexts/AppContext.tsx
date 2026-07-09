"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Macros, DailyData, MealType, FoodEntry, UserProfile, UserStats } from "@/types";
import { supabase } from "@/lib/supabase";

interface AppContextType {
  activeProfile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  macroGoals: Macros;
  setMacroGoals: (goals: Macros) => void;
  dailyData: DailyData;
  addEntry: (meal: MealType, entry: Omit<FoodEntry, "id" | "timestamp">) => void;
  removeEntry: (meal: MealType, entryId: string) => void;
  moveEntry: (fromMeal: MealType, toMeal: MealType, entryId: string) => void;
  updateEntry: (meal: MealType, entryId: string, updatedEntry: Partial<FoodEntry>) => void;
  updateAllMeals: (meals: Record<MealType, FoodEntry[]>) => void;
  clearDay: () => void;
  setDailyWeight: (weight: number) => void;
  isLoaded: boolean;
  foodHistory: Omit<FoodEntry, "id" | "timestamp" | "grams" | "macros">[];
  refreshFoodHistory: () => Promise<void>;
  weightHistory: { value: number; date: string }[];
  userStats: UserStats | null;
  setUserStats: (stats: UserStats) => void;
}

const defaultGoals: Macros = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fats: 65,
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultDailyData: DailyData = {
  date: getTodayString(),
  meals: {
    Desayuno: [],
    Almuerzo: [],
    Merienda: [],
    Cena: [],
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<UserProfile>("Lucas");
  const [macroGoals, setMacroGoalsState] = useState<Macros>(defaultGoals);
  const [dailyData, setDailyDataState] = useState<DailyData>(defaultDailyData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [foodHistory, setFoodHistoryState] = useState<Omit<FoodEntry, "id" | "timestamp" | "grams" | "macros">[]>([]);
  const [weightHistory, setWeightHistoryState] = useState<{ value: number; date: string }[]>([]);
  const [userStats, setUserStatsState] = useState<UserStats | null>(null);

  useEffect(() => {
    let currentProfile: UserProfile = "Lucas";
    if (!isLoaded) {
      const savedProfile = localStorage.getItem("pixel-tracker-active-profile") as UserProfile;
      if (savedProfile === "Lucas" || savedProfile === "Agustin" || savedProfile === "Mariano") {
        currentProfile = savedProfile;
        setTimeout(() => setActiveProfileState(savedProfile), 0);
      }
    } else {
      currentProfile = activeProfile;
    }

    const loadProfileData = async (profile: UserProfile) => {
      setIsLoaded(false);
      try {
        const todayStr = getTodayString();
        
        // 1. Fetch Settings & History
        const [settingsRes, historyRes, foodLogsRes, weightRes] = await Promise.all([
          supabase.from('user_settings').select('*').eq('profile', profile).single(),
          supabase.from('food_history').select('*').eq('profile', profile).order('updated_at', { ascending: false }),
          supabase.from('food_logs').select('*').eq('profile', profile).eq('date', todayStr),
          supabase.from('weight_logs').select('*').eq('profile', profile).eq('date', todayStr).single()
        ]);

        if (settingsRes.data) {
          setMacroGoalsState(settingsRes.data.goals || defaultGoals);
          setUserStatsState(settingsRes.data.stats || null);
        } else {
          setMacroGoalsState(defaultGoals);
          setUserStatsState(null);
        }

        if (historyRes.data) {
          setFoodHistoryState(historyRes.data.map((r: any) => ({ name: r.name, baseMacros: r.base_macros })));
        }

        // 2. Reconstruct DailyData from normalized food_logs
        let daily = {
          date: todayStr,
          meals: {
            Desayuno: [],
            Almuerzo: [],
            Merienda: [],
            Cena: []
          } as Record<MealType, FoodEntry[]>
        } as DailyData;
        
        if (foodLogsRes.data) {
           foodLogsRes.data.forEach((log: any) => {
              const mealType = log.meal_type as MealType;
              if (daily.meals[mealType]) {
                 daily.meals[mealType].push({
                    id: log.id,
                    name: log.product_name,
                    grams: log.amount,
                    timestamp: new Date(`${log.date}T${log.time}`).getTime(),
                    macros: { calories: log.calories, protein: log.protein, carbs: log.carbs, fats: log.fats, cholesterol: log.cholesterol, sodium: log.sodium, sugar: log.sugar, calcium: log.calcium },
                    baseMacros: {
                       calories: (log.calories / log.amount) * 100,
                       protein: (log.protein / log.amount) * 100,
                       carbs: (log.carbs / log.amount) * 100,
                       fats: (log.fats / log.amount) * 100
                    }
                 });
              }
           });
        }
        
        if (weightRes.data) {
           daily.weight = { value: weightRes.data.weight, date: weightRes.data.created_at };
        }
        
        setDailyDataState(daily);

      } catch (err) {
        console.error("Error loading normalized data", err);
      } finally {
        setIsLoaded(true);
      }
    };

    const syncSheetsIfNewDay = async () => {
      const todayStr = getTodayString();
      const lastSyncStr = localStorage.getItem("pixel-tracker-last-sync");
      
      if (lastSyncStr !== todayStr) {
         const d = new Date();
         d.setDate(d.getDate() - 1);
         const yYear = d.getFullYear();
         const yMonth = String(d.getMonth() + 1).padStart(2, '0');
         const yDay = String(d.getDate()).padStart(2, '0');
         const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
         
         try {
            await fetch('/api/sync-sheets', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ date: yesterdayStr })
            });
            localStorage.setItem("pixel-tracker-last-sync", todayStr);
         } catch(e) { console.error("Auto-sync failed", e); }
      }
    };

    loadProfileData(currentProfile).then(() => {
        syncSheetsIfNewDay();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const todayStr = getTodayString();
        if (dailyData.date !== todayStr) {
           loadProfileData(currentProfile);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeProfile]); 

  const setProfile = (profile: UserProfile) => {
    setActiveProfileState(profile);
    localStorage.setItem("pixel-tracker-active-profile", profile);
  };

  const setMacroGoals = (goals: Macros) => {
    setMacroGoalsState(goals);
    supabase.from('user_settings').upsert({ profile: activeProfile, goals }).then();
  };

  const setUserStats = (stats: UserStats) => {
    setUserStatsState(stats);
    supabase.from('user_settings').update({ stats }).eq('profile', activeProfile).then();
  };

  const addEntry = (meal: MealType, entry: Omit<FoodEntry, "id" | "timestamp">) => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newEntry: FoodEntry = {
      ...entry,
      id: newId,
      timestamp: Date.now(),
    };

    const newData = {
      ...dailyData,
      meals: {
        ...dailyData.meals,
        [meal]: [...dailyData.meals[meal], newEntry],
      },
    };
    setDailyDataState(newData);

    const date = getTodayString();
    const d = new Date();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    // Insert normalized row
    supabase.from('food_logs').insert({
       id: newId,
       profile: activeProfile,
       date,
       time,
       meal_type: meal,
       product_name: entry.name,
       amount: entry.grams,
       protein: entry.macros.protein || 0,
       carbs: entry.macros.carbs || 0,
       fats: entry.macros.fats || 0,
       calories: entry.macros.calories || 0,
       cholesterol: entry.macros.cholesterol || 0,
       sodium: entry.macros.sodium || 0,
       sugar: entry.macros.sugar || 0,
       calcium: entry.macros.calcium || 0
    }).then();

    const baseName = entry.name.replace(/\s*\(\d+g\)$/, '');
    setFoodHistoryState(prev => {
      const exists = prev.some(item => item.name === baseName);
      if (exists) return prev;
      const newHistory = [{ name: baseName, baseMacros: entry.baseMacros }, ...prev];
      supabase.from('food_history').upsert({ profile: activeProfile, name: baseName, base_macros: entry.baseMacros }).then();
      return newHistory;
    });
  };

  const removeEntry = (meal: MealType, entryId: string) => {
    const newData = {
      ...dailyData,
      meals: {
        ...dailyData.meals,
        [meal]: dailyData.meals[meal].filter((e) => e.id !== entryId),
      },
    };
    setDailyDataState(newData);
    
    supabase.from('food_logs').delete().eq('id', entryId).then();
  };

  const moveEntry = (fromMeal: MealType, toMeal: MealType, entryId: string) => {
    const entryToMove = dailyData.meals[fromMeal].find((e) => e.id === entryId);
    if (!entryToMove) return;

    const newData = {
      ...dailyData,
      meals: {
        ...dailyData.meals,
        [fromMeal]: dailyData.meals[fromMeal].filter((e) => e.id !== entryId),
        [toMeal]: [...dailyData.meals[toMeal], entryToMove],
      },
    };
    setDailyDataState(newData);

    supabase.from('food_logs').update({ meal_type: toMeal }).eq('id', entryId).then();
  };

  const updateEntry = (meal: MealType, entryId: string, updatedEntry: Partial<FoodEntry>) => {
    const newData = {
      ...dailyData,
      meals: {
        ...dailyData.meals,
        [meal]: dailyData.meals[meal].map((e) =>
          e.id === entryId ? { ...e, ...updatedEntry } : e
        ),
      },
    };
    setDailyDataState(newData);

    if (updatedEntry.grams || updatedEntry.macros) {
       supabase.from('food_logs').update({
          amount: updatedEntry.grams,
          protein: updatedEntry.macros?.protein,
          carbs: updatedEntry.macros?.carbs,
          fats: updatedEntry.macros?.fats,
          calories: updatedEntry.macros?.calories
       }).eq('id', entryId).then();
    }
  };

  const updateAllMeals = async (meals: Record<MealType, FoodEntry[]>) => {
    setDailyDataState({ ...dailyData, meals });

    const todayStr = getTodayString();
    
    // Sync with Supabase
    try {
      const { data: currentLogs } = await supabase.from('food_logs').select('id').eq('profile', activeProfile).eq('date', todayStr);
      const existingIds = currentLogs?.map(l => l.id) || [];
      
      const newMealsFlat = Object.entries(meals).flatMap(([meal, entries]) => entries.map(e => ({ ...e, meal })));
      const newIds = newMealsFlat.map(e => e.id);
      
      const idsToDelete = existingIds.filter(id => !newIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase.from('food_logs').delete().in('id', idsToDelete);
      }

      if (newMealsFlat.length > 0) {
        const upsertData = newMealsFlat.map(entry => {
          const d = new Date(entry.timestamp || Date.now());
          const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          return {
            id: entry.id,
            profile: activeProfile,
            date: todayStr,
            time,
            meal_type: entry.meal,
            product_name: entry.name,
            amount: entry.grams || 0,
            protein: entry.macros.protein || 0,
            carbs: entry.macros.carbs || 0,
            fats: entry.macros.fats || 0,
            calories: entry.macros.calories || 0,
            cholesterol: entry.macros.cholesterol || 0,
            sodium: entry.macros.sodium || 0,
            sugar: entry.macros.sugar || 0,
            calcium: entry.macros.calcium || 0
          };
        });
        await supabase.from('food_logs').upsert(upsertData, { onConflict: 'id' });
      }
    } catch (e) {
      console.error("Error syncing updateAllMeals to Supabase", e);
    }
  };

  const setDailyWeight = (weight: number) => {
    const newEntry = { value: weight, date: new Date().toISOString() };
    const newData = { ...dailyData, weight: newEntry };
    setDailyDataState(newData);

    const date = getTodayString();
    supabase.from('weight_logs').upsert({ profile: activeProfile, date, weight }, { onConflict: 'profile,date' }).then();
  };

  const clearDay = () => {
    setDailyDataState({
      date: getTodayString(),
      meals: {
        Desayuno: [],
        Almuerzo: [],
        Merienda: [],
        Cena: []
      }
    } as DailyData);
    supabase.from('food_logs').delete().eq('profile', activeProfile).eq('date', getTodayString()).then();
  };

  const refreshFoodHistory = async () => {
    const historyRes = await supabase.from('food_history').select('*').eq('profile', activeProfile).order('updated_at', { ascending: false });
    if (historyRes.data) {
      setFoodHistoryState(historyRes.data.map((r: any) => ({ name: r.name, baseMacros: r.base_macros })));
    }
  };

  return (
    <AppContext.Provider value={{
      activeProfile, setProfile, macroGoals, setMacroGoals, dailyData, addEntry, removeEntry, moveEntry, updateEntry, updateAllMeals, clearDay, isLoaded, foodHistory, refreshFoodHistory, setDailyWeight, weightHistory, userStats, setUserStats
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
