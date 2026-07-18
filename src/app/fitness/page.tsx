"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { getTodayString } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { 
  Dumbbell, Flame, Zap, Shield, Activity, Target, Settings, 
  ArrowDownCircle, ArrowUpCircle, Gauge, Award, TrendingUp, RefreshCw, Trash2
} from "lucide-react";

// Definición de las rutinas estáticas
const ROUTINES = {
  Push: [
    { name: "Press Inclinado", icon: <Dumbbell className="w-6 h-6 text-blue-400" /> },
    { name: "Press Plano", icon: <Dumbbell className="w-6 h-6 text-blue-400" /> },
    { name: "Press Militar", icon: <Flame className="w-6 h-6 text-orange-500" /> },
    { name: "Hombros en polea", icon: <Settings className="w-6 h-6 text-slate-500" /> }
  ],
  Pull: [
    { name: "Jalón al pecho", icon: <ArrowDownCircle className="w-6 h-6 text-emerald-400" /> },
    { name: "Remo en máquina", icon: <Activity className="w-6 h-6 text-green-500" /> },
    { name: "Dominadas libres", icon: <ArrowUpCircle className="w-6 h-6 text-red-500" /> }
  ],
  Piernas: [
    { name: "Sentadillas Hack", icon: <Zap className="w-6 h-6 text-yellow-500" /> },
    { name: "Press Legs a 45°", icon: <Shield className="w-6 h-6 text-purple-400" /> },
    { name: "Máquina de gemelos", icon: <Gauge className="w-6 h-6 text-pink-500" /> }
  ],
  Brazos: [
    { name: "Curl de bíceps", icon: <Target className="w-6 h-6 text-red-500" /> },
    { name: "Press francés", icon: <Dumbbell className="w-6 h-6 text-blue-500" /> },
    { name: "Tríceps en polea", icon: <Settings className="w-6 h-6 text-slate-500" /> }
  ]
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoutineCategory>("Push");

  // States para el formulario y base de datos
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [sets, setSets] = useState("4");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutLog[]>([]);

  // Cargar entrenamientos del día
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
      const { error } = await supabase
        .from('fitness_progress')
        .delete()
        .eq('id', id);
      
      if (!error) {
        await loadTodayWorkouts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calcular métricas
  const totalSetsToday = todayWorkouts.reduce((acc, log) => acc + Number(log.sets), 0);
  const totalVolumeToday = todayWorkouts.reduce((acc, log) => acc + (Number(log.sets) * Number(log.reps) * Number(log.weight)), 0);

  // Clasificación Rango Atlético divertida basada en volumen
  let athleteRange = "INICIANDO ENTRENAMIENTO";
  if (totalVolumeToday > 3000) {
    athleteRange = "TITÁN DE ÉLITE";
  } else if (totalVolumeToday > 1500) {
    athleteRange = "GUERRERO AVANZADO";
  } else if (totalVolumeToday > 500) {
    athleteRange = "RANGER INTERMEDIO";
  }

  const tabs: {id: RoutineCategory, color: string}[] = [
    { id: "Push", color: "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] text-white" },
    { id: "Pull", color: "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.4)] text-white" },
    { id: "Piernas", color: "bg-purple-600 shadow-[0_0_10px_rgba(139,92,246,0.4)] text-white" },
    { id: "Brazos", color: "bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.4)] text-white" }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 cyber-grid relative overflow-x-hidden pb-28">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        
        {/* Navigation/Header Bar */}
        <header className="flex justify-between items-center p-5 mb-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl">
          <div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Registro Gimnasio</h1>
            <p className="text-base font-bold tracking-tight text-white">{activeProfile} <span className="text-xs text-blue-400 ml-1.5">• Comando GYM</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Hoy</p>
            <p className="text-sm font-mono text-slate-300 font-bold">{getTodayString()}</p>
          </div>
        </header>

        {/* Top Banner Stats Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Active Sets widget */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Series Totales Hoy</span>
              <p className="text-xl font-display font-black text-emerald-400">{totalSetsToday} series</p>
            </div>
            <Dumbbell className="w-7 h-7 text-emerald-500/50 animate-pulse" />
          </div>

          {/* Volume widget */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Volumen Total Hoy</span>
              <p className="text-xl font-display font-black text-violet-400">{totalVolumeToday.toLocaleString()} kg</p>
            </div>
            <TrendingUp className="w-7 h-7 text-violet-500/50" />
          </div>

          {/* Level Widget */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Rango Atlético</span>
              <p className="text-xs font-display font-black text-amber-500 uppercase tracking-wider">{athleteRange}</p>
            </div>
            <Award className="w-7 h-7 text-amber-500/50" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedExercise(null); }}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? tab.color
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
              }`}
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
                if (!(e.target as HTMLElement).closest("form")) {
                  setSelectedExercise(selectedExercise === exercise.name ? null : exercise.name);
                }
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                selectedExercise === exercise.name 
                  ? 'border-blue-500/60 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl bg-black/40 border border-white/10`}>
                  {exercise.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-100 text-base">{exercise.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">TOCA PARA REGISTRAR SERIE</p>
                </div>
              </div>

              {/* Formulario que se despliega si está seleccionado */}
              {selectedExercise === exercise.name && (
                <div className="mt-4 pt-4 border-t border-white/15 animate-in slide-in-from-top-2 fade-in">
                  <form onSubmit={handleSave} className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Series</label>
                      <Input
                        type="number"
                        required
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        placeholder="4"
                        className="bg-black/60 border-white/15 text-white h-10 rounded-xl focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Reps</label>
                      <Input
                        type="number"
                        required
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        placeholder="10"
                        className="bg-black/60 border-white/15 text-white h-10 rounded-xl focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Peso (kg)</label>
                      <Input
                        type="number"
                        step="0.5"
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ej: 50"
                        className="bg-black/60 border-white/15 text-white h-10 rounded-xl focus:border-blue-500 text-center font-mono"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 hover:brightness-110 text-white font-semibold text-xs uppercase tracking-wider cursor-pointer">
                      {loading ? "..." : "Log"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Daily Lift List (Lógica adicional para listar los ejercicios ya anotados hoy) */}
        {todayWorkouts.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display font-black text-xs uppercase tracking-[0.15em] text-slate-300 border-b border-white/10 pb-2">
              Ejercicios Logueados Hoy
            </h2>
            <div className="space-y-2">
              {todayWorkouts.map((workout) => (
                <div key={workout.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 font-mono text-xs text-slate-200">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-100 font-sans text-sm">{workout.exercise}</p>
                    <p className="text-slate-400">{workout.category} • {workout.sets} series x {workout.reps} reps @ {workout.weight} kg</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(workout.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
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
