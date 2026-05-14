"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { getTodayString } from "@/lib/utils";

// Definición de las rutinas estáticas solicitadas
const ROUTINES = {
  Push: [
    { name: "Press Inclinado", icon: "🏋️‍♂️" },
    { name: "Press Plano", icon: "💪" },
    { name: "Press Militar", icon: "🔥" }
  ],
  Pull: [
    { name: "Jalón al pecho", icon: "🦍" },
    { name: "Remo en máquina", icon: "🛶" },
    { name: "Dominadas libres", icon: "🧗‍♂️" }
  ],
  Piernas: [
    { name: "Sentadillas Hack", icon: "🦵" },
    { name: "Press Legs a 45°", icon: "🛡️" },
    { name: "Máquina de gemelos", icon: "🩰" }
  ],
  Brazos: [
    { name: "Curl de bíceps", icon: "🦾" },
    { name: "Press francés", icon: "🔱" }
  ]
};

type RoutineCategory = keyof typeof ROUTINES;

export default function FitnessPage() {
  const { activeProfile } = useAppContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoutineCategory>("Push");

  // States para el formulario
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise || !reps || !weight) return;

    setLoading(true);
    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getTodayString(),
          category: activeTab,
          exercise: selectedExercise,
          reps: parseInt(reps),
          weight: parseFloat(weight),
          profile: activeProfile
        })
      });

      if (res.ok) {
        alert("¡Ejercicio guardado exitosamente!");
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
              onClick={() => setSelectedExercise(selectedExercise === exercise.name ? null : exercise.name)}
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
