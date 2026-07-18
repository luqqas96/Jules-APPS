"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MacroProgress } from "@/components/dashboard/MacroProgress";
import { MealSection } from "@/components/dashboard/MealSection";
import { MealType, UserProfile } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, CloudLightning, Settings } from "lucide-react";

export default function Home() {
  const { isLoaded, dailyData, activeProfile, setProfile } = useAppContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  // Live clock synchronization
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase());
      setDateStr(now.toLocaleDateString("es-AR", { weekday: "long", month: "short", day: "numeric" }).toUpperCase());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSheetsSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync-sheets", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage("Google Sheets sincronizado.");
      } else {
        setSyncMessage("Error de sincronización.");
      }
    } catch (e) {
      setSyncMessage("Fallo al conectar.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center cyber-grid">
        <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <span className="font-display font-bold text-sm text-emerald-400 tracking-widest uppercase">
          CARGANDO CENTRAL NUTRITIONAL NUTRIBOT v1.17...
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 cyber-grid relative overflow-x-hidden pb-24">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        
        {/* Navigation/Header Bar */}
        <header className="flex justify-between items-center p-5 mb-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center font-bold text-lg border border-white/20 shadow-[0_0_15px_rgba(139,92,246,0.3)] text-white">
              {activeProfile.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">{activeProfile}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{dateStr}</p>
            <p className="text-lg font-light text-white tabular-nums">{timeStr}</p>
          </div>
        </header>

        {/* Sync message alert overlay */}
        {syncMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-400 text-xs text-center font-mono">
            {syncMessage}
          </div>
        )}

        {/* Profile Tabs & Settings Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 mb-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
          <div className="flex space-x-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            {(["Lucas", "Agustin", "Mariano"] as UserProfile[]).map((profile) => (
              <button
                key={profile}
                onClick={() => setProfile(profile)}
                className={`px-4 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeProfile === profile
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {profile}
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => router.push("/settings")}
              className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Macro progress Bento Grid card */}
        <MacroProgress />

        {/* Meal sections container */}
        <div className="space-y-4 mb-6">
          {(["Desayuno", "Almuerzo", "Merienda", "Cena"] as MealType[]).map((meal) => (
            <div key={meal} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
              <MealSection mealType={meal} />
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}