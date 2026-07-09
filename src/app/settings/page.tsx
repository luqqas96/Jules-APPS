"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile } from "@/types";

import { DataExportCard } from "@/components/settings/DataExportCard";
import { FoodDictionaryCard } from "@/components/settings/FoodDictionaryCard";

export default function SettingsPage() {
  const { activeProfile, setProfile, macroGoals, setMacroGoals, isLoaded } = useAppContext();
  const router = useRouter();

  const [localGoals, setLocalGoals] = useState(macroGoals);

  // Sync local goals when profile or macroGoals change
  useEffect(() => {
    const timer = setTimeout(() => {
      setLocalGoals(macroGoals);
    }, 0);
    return () => clearTimeout(timer);
  }, [macroGoals, activeProfile]);

  const handleSave = () => {
    setMacroGoals({
      calories: Number(localGoals.calories),
      protein: Number(localGoals.protein),
      carbs: Number(localGoals.carbs),
      fats: Number(localGoals.fats),
    });
    router.push("/");
  };

  if (!isLoaded) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-6 pt-8">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Button>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Card className="mb-6 border-2 border-mint-200">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={activeProfile === "Lucas" ? "mint" : "outline"}
              className="flex-1"
              onClick={() => setProfile("Lucas")}
            >
              Lucas
            </Button>
            <Button
              variant={activeProfile === "Agustin" ? "mint" : "outline"}
              className="flex-1"
              onClick={() => setProfile("Agustin")}
            >
              Agustín
            </Button>
            <Button
              variant={activeProfile === "Mariano" ? "mint" : "outline"}
              className="flex-1"
              onClick={() => setProfile("Mariano")}
            >
              Mariano
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Daily Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Calories (kcal)</label>
            <Input
              type="number"
              value={localGoals.calories}
              onChange={(e) => setLocalGoals({...localGoals, calories: e.target.valueAsNumber || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Protein (g)</label>
            <Input
              type="number"
              value={localGoals.protein}
              onChange={(e) => setLocalGoals({...localGoals, protein: e.target.valueAsNumber || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Carbs (g)</label>
            <Input
              type="number"
              value={localGoals.carbs}
              onChange={(e) => setLocalGoals({...localGoals, carbs: e.target.valueAsNumber || 0})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fats (g)</label>
            <Input
              type="number"
              value={localGoals.fats}
              onChange={(e) => setLocalGoals({...localGoals, fats: e.target.valueAsNumber || 0})}
            />
          </div>
        </CardContent>
      </Card>

      <FoodDictionaryCard />
      <DataExportCard />

      <Button className="w-full mt-4" size="lg" variant="mint" onClick={handleSave}>
        Save Goals
      </Button>
    </div>
  );
}