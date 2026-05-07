"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Macros, DailyData, MealType, FoodEntry } from "@/types";

interface AppContextType {
  macroGoals: Macros;
  setMacroGoals: (goals: Macros) => void;
  dailyData: DailyData;
  addEntry: (meal: MealType, entry: Omit<FoodEntry, "id" | "timestamp">) => void;
  removeEntry: (meal: MealType, entryId: string) => void;
  updateEntry: (meal: MealType, entryId: string, updatedEntry: Partial<FoodEntry>) => void;
  updateAllMeals: (meals: Record<MealType, FoodEntry[]>) => void;
  clearDay: () => void;
  setDailyWeight: (weight: number) => void;
  isLoaded: boolean;
  foodHistory: Omit<FoodEntry, "id" | "timestamp" | "grams" | "macros">[];
}

const defaultGoals: Macros = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fats: 65,
};

const getTodayString = () => new Date().toISOString().split('T')[0];

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
  const [macroGoals, setMacroGoalsState] = useState<Macros>(defaultGoals);
  const [dailyData, setDailyDataState] = useState<DailyData>(defaultDailyData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [foodHistory, setFoodHistoryState] = useState<Omit<FoodEntry, "id" | "timestamp" | "grams" | "macros">[]>([]);

  useEffect(() => {
    // Load from local storage
    const storedGoals = localStorage.getItem("pixel-tracker-goals");
    if (storedGoals) {
      try {
                setMacroGoalsState(JSON.parse(storedGoals));
      } catch (e) {
        console.error("Failed to parse goals", e);
      }
    }

    const storedData = localStorage.getItem("pixel-tracker-daily");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        // If it's a new day, we should probably start fresh or keep previous?
        // Requirements say clear screen after finishing day.
        if (parsed.date === getTodayString()) {
                      setDailyDataState(parsed);
        } else {
           // It's a new day, start fresh.
                      setDailyDataState({ ...defaultDailyData, date: getTodayString() });
        }
      } catch (e) {
        console.error("Failed to parse daily data", e);
      }
    }

    const storedHistory = localStorage.getItem("pixel-tracker-history");
    if (storedHistory) {
      try {
                setFoodHistoryState(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse history data", e);
      }
    }

    setIsLoaded(true);
  }, []);

  const setMacroGoals = (goals: Macros) => {
    setMacroGoalsState(goals);
    localStorage.setItem("pixel-tracker-goals", JSON.stringify(goals));
  };

  const saveDailyData = (data: DailyData) => {
    setDailyDataState(data);
    localStorage.setItem("pixel-tracker-daily", JSON.stringify(data));
  };

  const addEntry = (meal: MealType, entry: Omit<FoodEntry, "id" | "timestamp">) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    const newData = {
      ...dailyData,
      meals: {
        ...dailyData.meals,
        [meal]: [...dailyData.meals[meal], newEntry],
      },
    };
    saveDailyData(newData);

    // Add to history
    const baseName = entry.name.replace(/\s*\(\d+g\)$/, '');
    setFoodHistoryState(prev => {
      const exists = prev.some(item => item.name === baseName);
      if (exists) return prev;
      const newHistory = [{ name: baseName, baseMacros: entry.baseMacros }, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem("pixel-tracker-history", JSON.stringify(newHistory));
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
    saveDailyData(newData);
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
    saveDailyData(newData);
  };

  const updateAllMeals = (meals: Record<MealType, FoodEntry[]>) => {
    const newData = {
      ...dailyData,
      meals,
    };
    saveDailyData(newData);
  };

  const setDailyWeight = (weight: number) => {
    const newData = { ...dailyData, weight: { value: weight, date: new Date().toISOString() } };
    saveDailyData(newData);
  };

  const clearDay = () => {
    const newData = { ...defaultDailyData, date: getTodayString() };
    saveDailyData(newData);
  };

  return (
    <AppContext.Provider value={{
      macroGoals, setMacroGoals, dailyData, addEntry, removeEntry, updateEntry, updateAllMeals, clearDay, isLoaded, foodHistory, setDailyWeight
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