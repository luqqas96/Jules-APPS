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

        <AIAssistantBox />
      </div>
    </main>
  );
}