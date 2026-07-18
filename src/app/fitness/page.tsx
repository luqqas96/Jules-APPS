"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { getTodayString } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Dumbbell, TrendingUp, Award, Trash2 } from "lucide-react";

// Rutinas estáticas por grupo
const ROUTINES = {
  Push: ["Press Inclinado", "Press Plano", "Press Militar", "Hombros en polea"],
  Pull: ["Jalón al pecho", "Remo en máquina", "Dominadas libres"],
  Piernas: ["Sentadillas Hack", "Press Legs a 45°", "Máquina de gemelos"],
  Brazos: ["Curl de bíceps", "Press francés", "Tríceps en polea"],
};

type RoutineCategory = keyof typeof ROUTINES;

interface WorkoutLog {
  id: string;
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  date: string;
}

export default function FitnessPage() {
  const { activeProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<RoutineCategory>("Push");

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [sets, setSets] = useState("4");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutLog[]>([]);

  const loadTodayWorkouts = async () => {
    try {
      const todayStr = getTodayString();
      const { data, error } = await supabase
        .from('fitness_progress')
        .select('*')
        .eq('profile', activeProfile)
        .eq('date', todayStr);

      if (!error && data) {
        setTodayWorkouts(data as WorkoutLog[]);
      }
    } catch (e) {
      console.error("Fallo al descargar entrenamientos", e);
    }
  };

  useEffect(() => {
    loadTodayWorkouts();
  }, [activeProfile]);

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
        setSets("4");
        setReps("10");
        setWeight("");
        setSelectedExercise(null);
        await loadTodayWorkouts();
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('fitness_progress').delete().eq('id', id);
      if (!error) await loadTodayWorkouts();
    } catch (e) {
      console.error(e);
    }
  };

  const totalSetsToday = todayWorkouts.reduce((acc, log) => acc + Number(log.sets), 0);
  const totalVolumeToday = todayWorkouts.reduce((acc, log) => acc + (Number(log.sets) * Number(log.reps) * Number(log.weight)), 0);

  let athleteRange = "Iniciando";
  if (totalVolumeToday > 3000) athleteRange = "Titán de élite";
  else if (totalVolumeToday > 1500) athleteRange = "Avanzado";
  else if (totalVolumeToday > 500) athleteRange = "Intermedio";

  const tabs = Object.keys(ROUTINES) as RoutineCategory[];

  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* Encabezado */}
        <header className="flex justify-between items-center p-5 mb-5 border border-border bg-surface rounded-3xl material-shadow">
          <div>
            <h1 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Registro de gimnasio</h1>
            <p className="text-base font-semibold tracking-tight text-foreground mt-0.5">{activeProfile}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Hoy</p>
            <p className="text-sm font-medium text-foreground tabular-nums">{getTodayString()}</p>
          </div>
        </header>

        {/* Métricas del día */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-surface border border-border rounded-3xl p-5 flex items-center justify-between material-shadow">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Series hoy</span>
              <p className="text-xl font-bold text-pixel-mint tabular-nums">{totalSetsToday}</p>
            </div>
            <Dumbbell className="w-7 h-7 text-pixel-mint/40" />
          </div>

          <div className="bg-surface border border-border rounded-3xl p-5 flex items-center justify-between material-shadow">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Volumen hoy</span>
              <p className="text-xl font-bold text-pixel-lavender tabular-nums">{totalVolumeToday.toLocaleString()} kg</p>
            </div>
            <TrendingUp className="w-7 h-7 text-pixel-lavender/40" />
          </div>

          <div className="bg-surface border border-border rounded-3xl p-5 flex items-center justify-between material-shadow">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Rango</span>
              <p className="text-sm font-bold text-pixel-peach">{athleteRange}</p>
            </div>
            <Award className="w-7 h-7 text-pixel-peach/40" />
          </div>
        </div>

        {/* Tabs de grupo muscular */}
        <div className="flex space-x-2 mb-5 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedExercise(null); }}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-pixel-mint text-white shadow-sm'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Ejercicios */}
        <div className="space-y-3 mb-8">
          {ROUTINES[activeTab].map((exercise) => (
            <div
              key={exercise}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("form")) {
                  setSelectedExercise(selectedExercise === exercise ? null : exercise);
                }
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                selectedExercise === exercise
                  ? 'border-pixel-mint bg-pixel-mint-light'
                  : 'border-border bg-surface hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-pixel-mint-light">
                  <Dumbbell className="w-5 h-5 text-pixel-mint" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-base">{exercise}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Toca para registrar una serie</p>
                </div>
              </div>

              {selectedExercise === exercise && (
                <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in">
                  <form onSubmit={handleSave} className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Series</label>
                      <Input type="number" required value={sets} onChange={(e) => setSets(e.target.value)} placeholder="4" className="h-10 rounded-xl text-center tabular-nums" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Reps</label>
                      <Input type="number" required value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10" className="h-10 rounded-xl text-center tabular-nums" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Peso (kg)</label>
                      <Input type="number" step="0.5" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="50" className="h-10 rounded-xl text-center tabular-nums" />
                    </div>
                    <Button type="submit" disabled={loading} variant="mint" className="h-10 px-5 rounded-xl font-semibold text-sm cursor-pointer">
                      {loading ? "…" : "Anotar"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ejercicios registrados hoy */}
        {todayWorkouts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Registrado hoy
            </h2>
            <div className="space-y-2">
              {todayWorkouts.map((workout) => (
                <div key={workout.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-sm">{workout.exercise}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{workout.category} • {workout.sets} series × {workout.reps} reps @ {workout.weight} kg</p>
                  </div>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
