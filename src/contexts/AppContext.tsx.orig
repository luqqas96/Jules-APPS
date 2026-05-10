"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Macros, DailyData, MealType, FoodEntry, UserProfile } from "@/types";

interface AppContextType {
  activeProfile: UserProfile;
  setProfile: (profile: UserProfile) => void;
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
  weightHistory: { value: number; date: string }[];
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
  const [activeProfile, setActiveProfileState] = useState<UserProfile>("Lucas");
  const [macroGoals, setMacroGoalsState] = useState<Macros>(defaultGoals);
  const [dailyData, setDailyDataState] = useState<DailyData>(defaultDailyData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [foodHistory, setFoodHistoryState] = useState<Omit<FoodEntry, "id" | "timestamp" | "grams" | "macros">[]>([]);
  const [weightHistory, setWeightHistoryState] = useState<{ value: number; date: string }[]>([]);

  // We want to re-load data whenever the active profile changes.
  useEffect(() => {
    // Determine the profile to use for the initial load.
    // Try to get saved profile, otherwise default to Lucas
    let currentProfile: UserProfile = "Lucas";
    if (!isLoaded) {
      const savedProfile = localStorage.getItem("pixel-tracker-active-profile") as UserProfile;
      if (savedProfile === "Lucas" || savedProfile === "Agustin") {
        currentProfile = savedProfile;
        setTimeout(() => setActiveProfileState(savedProfile), 0);
      }
    } else {
      currentProfile = activeProfile;
    }

    const loadProfileData = (profile: UserProfile) => {
      // Migrate old keys for Lucas if they exist but new ones don't
      if (profile === "Lucas") {
        if (!localStorage.getItem(`pixel-tracker-goals-${profile}`) && localStorage.getItem("pixel-tracker-goals")) {
          localStorage.setItem(`pixel-tracker-goals-${profile}`, localStorage.getItem("pixel-tracker-goals")!);
        }
        if (!localStorage.getItem(`pixel-tracker-daily-${profile}`) && localStorage.getItem("pixel-tracker-daily")) {
          localStorage.setItem(`pixel-tracker-daily-${profile}`, localStorage.getItem("pixel-tracker-daily")!);
        }
        if (!localStorage.getItem(`pixel-tracker-history-${profile}`) && localStorage.getItem("pixel-tracker-history")) {
          localStorage.setItem(`pixel-tracker-history-${profile}`, localStorage.getItem("pixel-tracker-history")!);
        }
        if (!localStorage.getItem(`pixel-tracker-weight-history-${profile}`) && localStorage.getItem("pixel-tracker-weight-history")) {
          localStorage.setItem(`pixel-tracker-weight-history-${profile}`, localStorage.getItem("pixel-tracker-weight-history")!);
        }
      }

      // Load macro goals
      const storedGoals = localStorage.getItem(`pixel-tracker-goals-${profile}`);
      if (storedGoals) {
        try {
          setMacroGoalsState(JSON.parse(storedGoals));
        } catch (e) {
          console.error("Failed to parse goals", e);
        }
      } else {
        setMacroGoalsState(defaultGoals);
      }

      // Load daily data
      const storedData = localStorage.getItem(`pixel-tracker-daily-${profile}`);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.date === getTodayString()) {
            setDailyDataState(parsed);
          } else {
            setDailyDataState({ ...defaultDailyData, date: getTodayString() });
          }
        } catch (e) {
          console.error("Failed to parse daily data", e);
        }
      } else {
        setDailyDataState({ ...defaultDailyData, date: getTodayString() });
      }

      // Load food history
      const storedHistory = localStorage.getItem(`pixel-tracker-history-${profile}`);
      if (storedHistory) {
        try {
          setFoodHistoryState(JSON.parse(storedHistory));
        } catch (e) {
          console.error("Failed to parse history data", e);
        }
      } else {
        setFoodHistoryState([]);
      }

      // Load weight history
      const storedWeightHistory = localStorage.getItem(`pixel-tracker-weight-history-${profile}`);
      if (storedWeightHistory) {
        try {
          setWeightHistoryState(JSON.parse(storedWeightHistory));
        } catch (e) {
          console.error("Failed to parse weight history data", e);
        }
      } else {
        setWeightHistoryState([]);
      }
    };

    loadProfileData(currentProfile);

    setTimeout(() => setIsLoaded(true), 0);
  }, [activeProfile, isLoaded]); // Re-run when activeProfile changes

  const setProfile = (profile: UserProfile) => {
    setActiveProfileState(profile);
    localStorage.setItem("pixel-tracker-active-profile", profile);
  };

  const setMacroGoals = (goals: Macros) => {
    setMacroGoalsState(goals);
    localStorage.setItem(`pixel-tracker-goals-${activeProfile}`, JSON.stringify(goals));
  };

  const saveDailyData = (data: DailyData) => {
    setDailyDataState(data);
    localStorage.setItem(`pixel-tracker-daily-${activeProfile}`, JSON.stringify(data));
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
      localStorage.setItem(`pixel-tracker-history-${activeProfile}`, JSON.stringify(newHistory));
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
    const newEntry = { value: weight, date: new Date().toISOString() };
    const newData = { ...dailyData, weight: newEntry };
    saveDailyData(newData);

    setWeightHistoryState(prev => {
      const today = new Date().toISOString().split('T')[0];
      const filtered = prev.filter(w => !w.date.startsWith(today));
      const newHistory = [newEntry, ...filtered].slice(0, 7);
      localStorage.setItem(`pixel-tracker-weight-history-${activeProfile}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearDay = () => {
    const newData = { ...defaultDailyData, date: getTodayString() };
    saveDailyData(newData);
  };

  return (
    <AppContext.Provider value={{
      activeProfile, setProfile, macroGoals, setMacroGoals, dailyData, addEntry, removeEntry, updateEntry, updateAllMeals, clearDay, isLoaded, foodHistory, setDailyWeight, weightHistory
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
