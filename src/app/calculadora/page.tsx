"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { Calculator, Target, Activity as ActivityIcon, Scale, RefreshCw } from "lucide-react";
import { UserStats } from "@/types";

export default function CalculadoraPage() {
  const { userStats, setUserStats, setMacroGoals, isLoaded, activeProfile } = useAppContext();
  const router = useRouter();

  const [gender, setGender] = useState<"Masculino" | "Femenino">("Masculino");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<"Sedentario" | "Ligero" | "Moderado" | "Activo" | "Muy Activo">("Moderado");
  const [goal, setGoal] = useState<"Perder peso" | "Mantener peso" | "Ganar masa muscular">("Mantener peso");
  const [goalOffset, setGoalOffset] = useState("500");

  // Resultados
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    if (userStats) {
      setGender(userStats.gender);
      setAge(userStats.age.toString());
      setWeight(userStats.weight.toString());
      setHeight(userStats.height.toString());
      setActivityLevel(userStats.activityLevel);
      setGoal(userStats.goal);
      if (userStats.goalOffset) setGoalOffset(userStats.goalOffset.toString());
    }
  }, [userStats]);

  const calculate = () => {
    const a = parseInt(age);
    const w = parseFloat(weight);
    const h = parseFloat(height);

    if (!a || !w || !h) return;

    const offset = parseInt(goalOffset) || 500;

    // Guardar stats
    const stats: UserStats = {
      gender,
      age: a,
      weight: w,
      height: h,
      activityLevel,
      goal,
      goalOffset: offset
    };
    setUserStats(stats);

    // Calcular BMI (IMC)
    const heightInMeters = h / 100;
    const currentBmi = w / (heightInMeters * heightInMeters);
    setBmi(currentBmi);

    // Calcular BMR (Mifflin-St Jeor)
    let currentBmr = (10 * w) + (6.25 * h) - (5 * a);
    if (gender === "Masculino") {
      currentBmr += 5;
    } else {
      currentBmr -= 161;
    }
    setBmr(currentBmr);

    // Calcular TDEE
    const multipliers = {
      "Sedentario": 1.2,
      "Ligero": 1.375,
      "Moderado": 1.55,
      "Activo": 1.725,
      "Muy Activo": 1.9
    };
    const currentTdee = currentBmr * multipliers[activityLevel];
    setTdee(currentTdee);
  };

  let standardCals = tdee ? tdee : 0;
  if (tdee && goal === "Perder peso") standardCals -= 500;
  if (tdee && goal === "Ganar masa muscular") standardCals += 500;

  let customCals = tdee ? tdee : 0;
  const customOffset = parseInt(goalOffset) || 0;
  if (tdee && goal === "Perder peso") customCals -= customOffset;
  if (tdee && goal === "Ganar masa muscular") customCals += customOffset;

  const wNum = parseFloat(weight) || 0;
  const p = Math.round(wNum * 2.2);
  const f = Math.round(wNum * 1);
  const standardMacros = { p, f, c: Math.max(0, Math.round((standardCals - (p * 4) - (f * 9)) / 4)) };
  const customMacros = { p, f, c: Math.max(0, Math.round((customCals - (p * 4) - (f * 9)) / 4)) };

  const applyGoals = (useCustom: boolean) => {
    const finalCals = useCustom ? customCals : standardCals;
    const finalMacros = useCustom ? customMacros : standardMacros;
    setMacroGoals({
      calories: Math.round(finalCals),
      protein: finalMacros.p,
      fats: finalMacros.f,
      carbs: finalMacros.c
    });
    alert("¡Objetivos diarios actualizados exitosamente!");
    router.push("/");
  };

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-x-hidden pb-28">

      <div className="max-w-md mx-auto px-4 pt-4">
        
        {/* Navigation/Header Bar */}
        <header className="flex justify-between items-center p-5 mb-6 border border-border bg-surface-secondary rounded-2xl">
          <div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Calculadora Basal</h1>
            <p className="text-base font-bold tracking-tight text-foreground">{activeProfile} <span className="text-xs text-pixel-blue ml-1.5">• BMR & IMC</span></p>
          </div>
        </header>

        {/* Formulario */}
        <div className="bg-surface border border-border rounded-[2rem] p-5 space-y-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setGender("Masculino")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                gender === "Masculino" 
                  ? "bg-pixel-mint text-white border-pixel-mint" 
                  : "bg-surface-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Masculino
            </button>
            <button 
              onClick={() => setGender("Femenino")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                gender === "Femenino" 
                  ? "bg-pixel-mint text-white border-pixel-mint" 
                  : "bg-surface-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Femenino
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Edad (años)</label>
              <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Ej: 25" className="bg-surface-secondary border-border text-foreground h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Peso (kg)</label>
              <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ej: 75" className="bg-surface-secondary border-border text-foreground h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Altura (cm)</label>
              <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="Ej: 175" className="bg-surface-secondary border-border text-foreground h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Actividad</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground focus:outline-none focus:border-pixel-mint"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
              >
                <option value="Sedentario">Sedentario</option>
                <option value="Ligero">Ligero (1-3 días/sem)</option>
                <option value="Moderado">Moderado (3-5 días/sem)</option>
                <option value="Activo">Activo (6-7 días/sem)</option>
                <option value="Muy Activo">Muy Activo</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Objetivo Físico</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground focus:outline-none focus:border-pixel-mint"
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
              >
                <option value="Perder peso">Perder peso</option>
                <option value="Mantener peso">Mantener peso</option>
                <option value="Ganar masa muscular">Ganar masa muscular</option>
              </select>
            </div>
          </div>

          <button 
            className="w-full h-11 bg-pixel-mint hover:brightness-95 text-white rounded-xl font-semibold text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center space-x-2"
            onClick={calculate}
          >
            <Calculator className="w-4 h-4" />
            <span>Calcular</span>
          </button>
        </div>

        {/* Resultados */}
        {bmi && bmr && tdee && (
          <div className="space-y-4 animate-in slide-in-from-top-4 fade-in mt-6">
            <h2 className="font-semibold text-xs uppercase tracking-[0.15em] text-foreground border-b border-border pb-2">
              Resultados Obtenidos
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface border border-border p-4 rounded-[1.5rem] flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-pixel-blue mb-1.5">
                  <Scale className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider">IMC (BMI)</span>
                </div>
                <div className="text-2xl font-black text-foreground">{bmi.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">
                  {bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Peso normal" : bmi < 30 ? "Sobrepeso" : "Obesidad"}
                </div>
              </div>

              <div className="bg-surface border border-border p-4 rounded-[1.5rem] flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-pixel-mint mb-1.5">
                  <ActivityIcon className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider">TDEE Diario</span>
                </div>
                <div className="text-2xl font-black text-foreground">{Math.round(tdee)} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">Basal: {Math.round(bmr)} kcal</div>
              </div>
            </div>

            {/* Standard Plan Card */}
            <div className="bg-surface border border-border p-5 rounded-[1.5rem] opacity-75">
              <div className="flex items-center space-x-2 text-muted-foreground mb-4 font-mono text-xs uppercase">
                <Calculator className="w-4 h-4" />
                <span>Recomendado (Fórmula ±500)</span>
              </div>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Calorías ({goal})</p>
                  <p className="text-xl font-black text-foreground">{Math.round(standardCals)} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-peach mb-0.5">Proteína</div>
                  <div className="font-bold text-foreground text-xs">{standardMacros.p}g</div>
                </div>
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-mint mb-0.5">Carbs</div>
                  <div className="font-bold text-foreground text-xs">{standardMacros.c}g</div>
                </div>
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-lavender mb-0.5">Grasas</div>
                  <div className="font-bold text-foreground text-xs">{standardMacros.f}g</div>
                </div>
              </div>
            </div>

            {/* Custom Plan Card */}
            <div className="bg-surface border border-pixel-peach/40 p-5 rounded-[1.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-pixel-peach text-white text-[9px] font-mono font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">ACTUAL</div>
              <div className="flex items-center space-x-2 text-pixel-peach mb-4 font-mono text-xs uppercase">
                <Target className="w-4 h-4" />
                <span>Plan Personalizado</span>
              </div>

              {goal !== "Mantener peso" && (
                <div className="mb-4">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
                    Calorías de {goal === "Perder peso" ? "déficit" : "superávit"} deseadas
                  </label>
                  <Input type="number" value={goalOffset} onChange={e => setGoalOffset(e.target.value)} placeholder="500" className="h-10 text-base font-bold bg-pixel-peach-light border-pixel-peach/30 text-foreground rounded-xl" />
                </div>
              )}
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Calorías Diarias Ajustadas</p>
                  <p className="text-2xl font-black text-foreground">{Math.round(customCals)} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-peach mb-0.5">Proteína</div>
                  <div className="font-bold text-foreground text-sm">{customMacros.p}g</div>
                </div>
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-mint mb-0.5">Carbs</div>
                  <div className="font-bold text-foreground text-sm">{customMacros.c}g</div>
                </div>
                <div className="bg-surface-secondary p-2 rounded-xl text-center border border-border font-mono">
                  <div className="text-[9px] uppercase font-bold text-pixel-lavender mb-0.5">Grasas</div>
                  <div className="font-bold text-foreground text-sm">{customMacros.f}g</div>
                </div>
              </div>

              <button 
                onClick={() => applyGoals(true)} 
                className="w-full mt-5 h-11 bg-pixel-mint hover:brightness-95 text-white font-semibold text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center space-x-2 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Aplicar Plan</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
