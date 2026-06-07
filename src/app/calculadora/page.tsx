"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { Calculator, Target, Activity as ActivityIcon, Scale, RefreshCw } from "lucide-react";
import { UserStats } from "@/types";

export default function CalculadoraPage() {
  const { userStats, setUserStats, setMacroGoals, isLoaded } = useAppContext();
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
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Calculadora BMR & IMC</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        
        {/* Formulario */}
        <div className="bg-surface p-5 rounded-2xl border-2 border-border/50 space-y-4">
          <div className="flex gap-2">
            <Button 
              variant={gender === "Masculino" ? "mint" : "outline"} 
              className="flex-1" 
              onClick={() => setGender("Masculino")}
            >Masculino</Button>
            <Button 
              variant={gender === "Femenino" ? "mint" : "outline"} 
              className="flex-1" 
              onClick={() => setGender("Femenino")}
            >Femenino</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Edad (años)</label>
              <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Ej: 25" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Peso (kg)</label>
              <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ej: 75" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Altura (cm)</label>
              <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="Ej: 175" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Actividad</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
              >
                <option value="Sedentario">Sedentario (Trabajo de oficina, sin ejercicio)</option>
                <option value="Ligero">Ligero (Ejercicio 1-3 días/sem)</option>
                <option value="Moderado">Moderado (Entrenamiento 3-5 días/sem)</option>
                <option value="Activo">Activo (Entrenamiento intenso 6-7 días/sem)</option>
                <option value="Muy Activo">Muy Activo (Trabajador físico + Entrenamiento)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo Físico</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
              >
                <option value="Perder peso">Perder peso</option>
                <option value="Mantener peso">Mantener peso</option>
                <option value="Ganar masa muscular">Ganar masa muscular</option>
              </select>
            </div>
          </div>

          <Button className="w-full h-12 bg-pixel-blue text-white rounded-xl font-bold" onClick={calculate}>
            <Calculator className="w-5 h-5 mr-2" /> Calcular
          </Button>
        </div>

        {/* Resultados */}
        {bmi && bmr && tdee && (
          <div className="space-y-4 animate-in slide-in-from-top-4 fade-in">
            <h2 className="text-lg font-bold">Resultados</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-pixel-blue-light/30 p-4 rounded-xl border border-pixel-blue/20">
                <div className="flex items-center space-x-2 text-pixel-blue mb-1">
                  <Scale className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">IMC (BMI)</span>
                </div>
                <div className="text-2xl font-black text-foreground">{bmi.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Peso normal" : bmi < 30 ? "Sobrepeso" : "Obesidad"}
                </div>
              </div>

              <div className="bg-pixel-mint-light/30 p-4 rounded-xl border border-pixel-mint/20">
                <div className="flex items-center space-x-2 text-pixel-mint mb-1">
                  <ActivityIcon className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">TDEE / Basal</span>
                </div>
                <div className="text-2xl font-black text-foreground">{Math.round(tdee)} <span className="text-xs font-medium text-muted-foreground">kcal</span></div>
                <div className="text-xs text-muted-foreground mt-1">Basal: {Math.round(bmr)} kcal</div>
              </div>
            </div>

            {/* Standard Plan Card */}
            <div className="bg-surface p-5 rounded-2xl border-2 border-border/50 opacity-80">
              <div className="flex items-center space-x-2 text-muted-foreground mb-4">
                <Calculator className="w-5 h-5" />
                <span className="font-bold">Recomendado (Fórmula ±500)</span>
              </div>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Calorías ({goal})</p>
                  <p className="text-2xl font-black">{Math.round(standardCals)} <span className="text-sm font-medium text-muted-foreground">kcal</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-pixel-peach-light/20 p-2 rounded-lg text-center border border-pixel-peach/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-peach mb-1">Proteína</div>
                  <div className="font-bold">{standardMacros.p}g</div>
                </div>
                <div className="bg-pixel-mint-light/20 p-2 rounded-lg text-center border border-pixel-mint/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-mint mb-1">Carbs</div>
                  <div className="font-bold">{standardMacros.c}g</div>
                </div>
                <div className="bg-pixel-lavender-light/20 p-2 rounded-lg text-center border border-pixel-lavender/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-lavender mb-1">Grasas</div>
                  <div className="font-bold">{standardMacros.f}g</div>
                </div>
              </div>
            </div>

            {/* Custom Plan Card */}
            <div className="bg-surface p-5 rounded-2xl border-2 border-orange-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">ACTUAL</div>
              <div className="flex items-center space-x-2 text-orange-500 mb-4">
                <Target className="w-5 h-5" />
                <span className="font-bold">Plan Personalizado</span>
              </div>

              {goal !== "Mantener peso" && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    ¿Cuántas calorías de {goal === "Perder peso" ? "déficit" : "superávit"} deseas aplicar?
                  </label>
                  <Input type="number" value={goalOffset} onChange={e => setGoalOffset(e.target.value)} placeholder="Ej: 300 o 500" className="h-10 text-lg font-semibold bg-orange-500/5 border-orange-500/20" />
                </div>
              )}
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Calorías Diarias Ajustadas</p>
                  <p className="text-3xl font-black">{Math.round(customCals)} <span className="text-sm font-medium text-muted-foreground">kcal</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-pixel-peach-light/20 p-2 rounded-lg text-center border border-pixel-peach/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-peach mb-1">Proteína</div>
                  <div className="font-bold text-lg">{customMacros.p}g</div>
                </div>
                <div className="bg-pixel-mint-light/20 p-2 rounded-lg text-center border border-pixel-mint/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-mint mb-1">Carbs</div>
                  <div className="font-bold text-lg">{customMacros.c}g</div>
                </div>
                <div className="bg-pixel-lavender-light/20 p-2 rounded-lg text-center border border-pixel-lavender/20">
                  <div className="text-[10px] uppercase font-bold text-pixel-lavender mb-1">Grasas</div>
                  <div className="font-bold text-lg">{customMacros.f}g</div>
                </div>
              </div>

              <Button onClick={() => applyGoals(true)} className="w-full mt-5 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg">
                <RefreshCw className="w-4 h-4 mr-2" /> Aplicar Plan Personalizado
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
