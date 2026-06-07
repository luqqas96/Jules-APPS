"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { getTodayString } from "@/lib/utils";
import { Dumbbell, Flame, Zap, Shield, Activity, Target, Settings, ArrowDownCircle, ArrowUpCircle, Gauge } from "lucide-react";

// Definición de las rutinas estáticas
const ROUTINES = {
  Push: [
    { name: "Press Inclinado", icon: <Dumbbell className="w-6 h-6 text-pixel-mint" /> },
    { name: "Press Plano", icon: <Dumbbell className="w-6 h-6 text-pixel-mint" /> },
    { name: "Press Militar", icon: <Flame className="w-6 h-6 text-orange-500" /> },
    { name: "Hombros en polea", icon: <Settings className="w-6 h-6 text-gray-500" /> }
  ],
  Pull: [
    { name: "Jalón al pecho", icon: <ArrowDownCircle className="w-6 h-6 text-pixel-peach" /> },
    { name: "Remo en máquina", icon: <Activity className="w-6 h-6 text-green-500" /> },
    { name: "Dominadas libres", icon: <ArrowUpCircle className="w-6 h-6 text-red-500" /> }
  ],
  Piernas: [
    { name: "Sentadillas Hack", icon: <Zap className="w-6 h-6 text-yellow-500" /> },
    { name: "Press Legs a 45°", icon: <Shield className="w-6 h-6 text-pixel-blue" /> },
    { name: "Máquina de gemelos", icon: <Gauge className="w-6 h-6 text-purple-500" /> }
  ],
  Brazos: [
    { name: "Curl de bíceps", icon: <Target className="w-6 h-6 text-red-500" /> },
    { name: "Press francés", icon: <Dumbbell className="w-6 h-6 text-blue-500" /> },
    { name: "Tríceps en polea", icon: <Settings className="w-6 h-6 text-gray-500" /> }
  ]
};

type RoutineCategory = keyof typeof ROUTINES;

export default function FitnessPage() {
  const { activeProfile } = useAppContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoutineCategory>("Push");

  // States para el formulario
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise || !sets || !reps || !weight) return;

    setLoading(true);
    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getTodayString(),
          category: activeTab,
          exercise: selectedExercise,
          sets: parseInt(sets),
          reps: parseInt(reps),
          weight: parseFloat(weight),
          profile: activeProfile
        })
      });

      if (res.ok) {
        alert("¡Ejercicio guardado exitosamente!");
        setSets("");
        setReps("");
        setWeight("");
        setSelectedExercise(null);
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const tabs: {id: RoutineCategory, color: string}[] = [
    { id: "Push", color: "bg-pixel-mint" },
    { id: "Pull", color: "bg-pixel-peach" },
    { id: "Piernas", color: "bg-pixel-blue" },
    { id: "Brazos", color: "bg-pixel-lavender" }
  ];

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 flex justify-between items-center border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fitness Progress</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {new Date(getTodayString()).toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedExercise(null); }}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === tab.id ? `${tab.color} text-white shadow-md` : 'bg-surface-secondary text-muted-foreground hover:bg-surface-secondary/80'}`}
            >
              {tab.id}
            </button>
          ))}
        </div>

        {/* Exercises Grid */}
        <div className="space-y-4 mb-8">
          {ROUTINES[activeTab].map((exercise) => (
            <div
              key={exercise.name}
              onClick={(e) => {
                // Only toggle if we are clicking the card itself, not the form inputs inside it
                if (!(e.target as HTMLElement).closest("form")) {
                  setSelectedExercise(selectedExercise === exercise.name ? null : exercise.name);
                }
              }}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedExercise === exercise.name ? 'border-pixel-blue bg-pixel-blue-light/20 shadow-sm' : 'border-transparent bg-surface hover:bg-surface-secondary'}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedExercise === exercise.name ? 'bg-white shadow-sm' : 'bg-background'}`}>
                  {exercise.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">{exercise.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap to log set</p>
                </div>
              </div>

              {/* Formulario que se despliega si está seleccionado */}
              {selectedExercise === exercise.name && (
                <div className="mt-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 fade-in">
                  <form onSubmit={handleSave} className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sets</label>
                      <Input
                        type="number"
                        required
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        placeholder="Ej: 3"
                        className="bg-background text-base h-11"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Reps</label>
                      <Input
                        type="number"
                        required
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        placeholder="Ej: 10"
                        className="bg-background text-base h-11"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Weight (kg/lb)</label>
                      <Input
                        type="number"
                        step="0.5"
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ej: 50"
                        className="bg-background text-base h-11"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="h-11 px-5 rounded-xl bg-pixel-blue hover:bg-pixel-blue/90 text-white font-semibold">
                      {loading ? "..." : "Log"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
