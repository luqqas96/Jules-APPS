"use client";
import { getMealName } from "@/lib/translations";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MealType } from "@/types";

export default function HistorialPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (selectedDate: string) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/sheets?date=${selectedDate}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.meals);
      } else {
        setError(json.error || "Error retrieving data.");
      }
    } catch (e: unknown) {
      setError("Connection error loading history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    if (date) fetchData(date);
  }, [date]);

  const mealsList: MealType[] = ["Desayuno", "Almuerzo", "Merienda", "Cena"];

  // Calculate totals
  let totalCals = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  if (data) {
    Object.values(data).forEach((entries: any[]) => {
      entries.forEach((e: any) => {
        totalCals += e.macros.calories;
        totalProt += e.macros.protein;
        totalCarbs += e.macros.carbs;
        totalFats += e.macros.fats;
      });
    });
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Nutrition History</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-2">
        <div className="bg-surface p-4 rounded-2xl shadow-sm mb-6 flex flex-col space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-center font-medium h-12"
          />
        </div>

        {loading && (
          <div className="text-center text-muted-foreground animate-pulse mt-10">
            Fetching records from Google Sheets...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="animate-in fade-in slide-in-from-bottom-4">

            <Card className="mb-6 bg-surface shadow-sm border-none">
              <CardContent className="p-5">
                <h3 className="font-semibold text-center mb-4 text-sm text-muted-foreground uppercase tracking-wider">Consumption Summary</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center bg-pixel-mint-light/50 p-2 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Kcal</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalCals)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-peach-light/50 p-2 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Prot</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalProt)}g</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-blue-light/50 p-2 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Carb</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalCarbs)}g</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-lavender-light/50 p-2 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Fat</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalFats)}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {mealsList.map((meal) => {
                const entries = data[meal] || [];
                const mealCals = entries.reduce((acc: number, curr: any) => acc + curr.macros.calories, 0);

                if (entries.length === 0) return null;

                return (
                  <Card key={getMealName(meal)} className="overflow-hidden border-none shadow-sm bg-surface">
                    <div className="p-4 flex items-center justify-between border-b border-surface-secondary">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-pixel-mint-light flex items-center justify-center text-pixel-mint text-sm">
                          {meal === "Desayuno" && "🌅"}
                          {meal === "Almuerzo" && "☀️"}
                          {meal === "Merienda" && "☕"}
                          {meal === "Cena" && "🌙"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-md leading-tight">{getMealName(meal)}</h3>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        {Math.round(mealCals)} kcal
                      </div>
                    </div>
                    <div className="p-3">
                      <ul className="space-y-2">
                        {entries.map((entry: any) => (
                          <li key={entry.id} className="bg-surface-secondary p-3 rounded-xl flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{entry.name} <span className="text-xs font-normal text-muted-foreground ml-1">({entry.grams})</span></p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {Math.round(entry.macros.calories)} kcal • P: {Math.round(entry.macros.protein)}g • C: {Math.round(entry.macros.carbs)}g • G: {Math.round(entry.macros.fats)}g
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                );
              })}

              {totalCals === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No food recorded in Google Sheets for this date.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
