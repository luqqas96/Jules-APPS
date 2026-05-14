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

  // We want to re-load data whenever the active profile changes.
  useEffect(() => {
    // Determine the profile to use for the initial load.
    // Try to get saved profile, otherwise default to Lucas
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
          const todayStr = getTodayString();

          if (parsed.date === todayStr) {
            // Sanitize parsed meals to ensure they exist and have macros to prevent crashes
            const sanitizedMeals = {
              Desayuno: parsed.meals?.Desayuno || [],
              Almuerzo: parsed.meals?.Almuerzo || [],
              Merienda: parsed.meals?.Merienda || [],
              Cena: parsed.meals?.Cena || []
            };
            const sanitizeEntries = (entries: any[]) => {
               if (!Array.isArray(entries)) return [];
               return entries.map(e => ({
                  ...e,
                  macros: e.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 }
               }));
            };
            parsed.meals = {
               Desayuno: sanitizeEntries(sanitizedMeals.Desayuno),
               Almuerzo: sanitizeEntries(sanitizedMeals.Almuerzo),
               Merienda: sanitizeEntries(sanitizedMeals.Merienda),
               Cena: sanitizeEntries(sanitizedMeals.Cena)
            };
            setDailyDataState(parsed);
          } else {
            // Auto-export logic if the stored date is from the past and has data
            const hasData = Object.values(parsed.meals as Record<MealType, FoodEntry[]>).some(entries => entries.length > 0) || parsed.weight;

            if (hasData) {
              console.log("Auto-exporting previous day data:", parsed.date);
              const payload = {
                date: parsed.date,
                meals: parsed.meals,
                weight: parsed.weight?.value,
                profile: profile,
                totals: {} // Can be ignored or calculated if needed by the backend
              };

              // Fire and forget export
              fetch("/api/sheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              }).then(res => res.json()).then(data => {
                if (data.error) {
                  console.error("Auto-export failed:", data.error);
                } else {
                  console.log("Auto-export successful for", parsed.date);
                }
              }).catch(e => {
                console.error("Connection error during auto-export", e);
              });
            }

            // Start fresh for today
            const freshData = { ...defaultDailyData, date: todayStr };
            setDailyDataState(freshData);
            localStorage.setItem(`pixel-tracker-daily-${profile}`, JSON.stringify(freshData));
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

    // Add visibility listener for PWA to catch day rollovers when resuming app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const todayStr = getTodayString();
        // Compare with current localStorage to ensure we have latest data
        const storedData = localStorage.getItem(`pixel-tracker-daily-${currentProfile}`);
        if (storedData) {
           try {
              const parsed = JSON.parse(storedData);
              if (parsed.date !== todayStr) {
                 // Trigger full reload logic to handle auto-export and reset
                 loadProfileData(currentProfile);
              }
           } catch (e) {
              console.error(e);
           }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
      const today = getTodayString();
      // Compare local date string with the stored ISO string by first converting ISO to local
      const filtered = prev.filter(w => {
        const d = new Date(w.date);
        const wDateLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return wDateLocal !== today;
      });
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
