"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MacroProgress } from "@/components/dashboard/MacroProgress";
import { MealSection } from "@/components/dashboard/MealSection";
import { MealType, UserProfile } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2, Settings } from "lucide-react";

export default function Home() {
  const { isLoaded, activeProfile, setProfile } = useAppContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  // Reloj en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: true }));
      const d = now.toLocaleDateString("es-AR", { weekday: "long", month: "long", day: "numeric" });
      setDateStr(d.charAt(0).toUpperCase() + d.slice(1));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-pixel-mint animate-spin mb-4" />
        <span className="text-sm text-muted-foreground font-medium tracking-wide">
          Cargando tu día…
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* Encabezado */}
        <header className="flex justify-between items-center p-5 mb-5 border border-border bg-surface rounded-3xl material-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-pixel-mint flex items-center justify-center font-semibold text-lg text-white">
              {activeProfile.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">{activeProfile}</p>
              <p className="text-xs text-muted-foreground">{dateStr}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-medium text-foreground tabular-nums">{timeStr}</p>
          </div>
        </header>

        {/* Selector de perfiles + Ajustes */}
        <div className="flex items-center justify-between gap-3 p-2 mb-5 rounded-3xl bg-surface border border-border">
          <div className="flex space-x-1 p-1 bg-surface-secondary rounded-2xl flex-1">
            {(["Lucas", "Agustin", "Mariano"] as UserProfile[]).map((profile) => (
              <button
                key={profile}
                onClick={() => setProfile(profile)}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeProfile === profile
                    ? "bg-pixel-mint text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {profile}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="p-2.5 rounded-2xl bg-surface-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-all"
            aria-label="Ajustes"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Progreso de macros */}
        <MacroProgress />

        {/* Comidas del día */}
        <div className="space-y-3 mb-6">
          {(["Desayuno", "Almuerzo", "Merienda", "Cena"] as MealType[]).map((meal) => (
            <MealSection key={meal} mealType={meal} />
          ))}
        </div>

      </div>
    </main>
  );
}
