"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MacroProgress } from "@/components/dashboard/MacroProgress";
import { MealSection } from "@/components/dashboard/MealSection";
import { AIAssistantBox } from "@/components/dashboard/AIAssistantBox";
import { MealType } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isLoaded, dailyData, clearDay, activeProfile } = useAppContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !isLoaded) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 flex justify-between items-center border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold text-foreground">Nutrition</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {new Date(dailyData.date).toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </Button>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <MacroProgress />

        <div className="space-y-4 mb-6">
          {(["Desayuno", "Almuerzo", "Merienda", "Cena"] as MealType[]).map((meal) => (
            <MealSection key={meal} mealType={meal} />
          ))}
        </div>

        <AIAssistantBox />
      </div>
    </main>
  );
}