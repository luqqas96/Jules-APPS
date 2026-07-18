"use client";
import { getMealName } from "@/lib/translations";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MealType } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2, Plus, RefreshCw, X } from "lucide-react";

export default function HistorialPage() {
  const { activeProfile } = useAppContext();

  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayLocal());
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resyncing, setResyncing] = useState(false);

  // States for Editing
  const [editingEntry, setEditingEntry] = useState<{
    id: string;
    name: string;
    grams: number | string;
    calories: number | string;
    protein: number | string;
    carbs: number | string;
    fats: number | string;
  } | null>(null);

  // States for Adding
  const [addingMeal, setAddingMeal] = useState<MealType | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    grams: "100",
    calories: "",
    protein: "",
    carbs: "",
    fats: ""
  });

  const fetchData = async (selectedDate: string) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/sheets?date=${selectedDate}&profile=${activeProfile}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.meals);
      } else {
        setError(json.error || "Error al recuperar datos.");
      }
    } catch (e: unknown) {
      setError("Error de conexión al cargar historial.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (date) fetchData(date);
  }, [date, activeProfile]);

  const mealsList: MealType[] = ["Desayuno", "Almuerzo", "Merienda", "Cena"];

  // Calculate totals
  let totalCals = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  if (data) {
    Object.values(data).forEach((entries: any[]) => {
      entries.forEach((e: any) => {
        totalCals += e.macros.calories || 0;
        totalProt += e.macros.protein || 0;
        totalCarbs += e.macros.carbs || 0;
        totalFats += e.macros.fats || 0;
      });
    });
  }

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro histórico?")) return;
    try {
      await supabase.from('food_logs').delete().eq('id', id);
      fetchData(date);
    } catch (e) {
      alert("Error al eliminar el registro.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    try {
      await supabase.from('food_logs').update({
        product_name: editingEntry.name,
        amount: Number(editingEntry.grams) || 0,
        calories: Number(editingEntry.calories) || 0,
        protein: Number(editingEntry.protein) || 0,
        carbs: Number(editingEntry.carbs) || 0,
        fats: Number(editingEntry.fats) || 0,
      }).eq('id', editingEntry.id);
      setEditingEntry(null);
      fetchData(date);
    } catch (e) {
      alert("Error al guardar cambios.");
    }
  };

  const handleSaveAdd = async () => {
    if (!addingMeal || !addForm.name.trim()) return;
    const newId = Math.random().toString(36).substring(2, 9);
    try {
      await supabase.from('food_logs').insert({
        id: newId,
        profile: activeProfile,
        date: date,
        time: "12:00",
        meal_type: addingMeal,
        product_name: addForm.name.trim(),
        amount: Number(addForm.grams) || 0,
        calories: Number(addForm.calories) || 0,
        protein: Number(addForm.protein) || 0,
        carbs: Number(addForm.carbs) || 0,
        fats: Number(addForm.fats) || 0,
        cholesterol: 0,
        sodium: 0,
        sugar: 0,
        calcium: 0
      });
      setAddingMeal(null);
      setAddForm({ name: "", grams: "100", calories: "", protein: "", carbs: "", fats: "" });
      fetchData(date);
    } catch (e) {
      alert("Error al añadir el alimento al historial.");
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      const res = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      if (res.ok) {
        alert(`¡Fecha ${date} resincronizada con Google Sheets!`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al resincronizar.");
      }
    } catch (e) {
      alert("Error de conexión.");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 cyber-grid relative overflow-x-hidden pb-28">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md mx-auto px-4 pt-4">
        
        {/* Navigation/Header Bar */}
        <header className="flex justify-between items-center p-5 mb-6 border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl">
          <div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Consola Historial</h1>
            <p className="text-base font-bold tracking-tight text-white">{activeProfile} <span className="text-xs text-blue-400 ml-1.5">• Diario Histórico</span></p>
          </div>
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} />
            <span>{resyncing ? 'Resincronizando...' : 'Resincronizar'}</span>
          </button>
        </header>

        {/* Date Selector */}
        <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[2rem] mb-6 flex flex-col space-y-2 backdrop-blur-md">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Seleccionar Fecha del Historial</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-center font-bold text-base h-11 bg-black/60 border-white/10 text-white rounded-xl focus:border-blue-500"
          />
        </div>

        {loading && (
          <div className="text-center text-slate-400 animate-pulse mt-10 text-xs font-mono uppercase tracking-widest">
            Cargando registros del archivo central...
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-[1.5rem] text-center text-xs font-mono">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            
            {/* Day Summary Card */}
            <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[2rem]">
              <h3 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest text-center mb-4">Resumen de Consumo ({date})</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center bg-white/5 p-2 rounded-xl border border-white/5 font-mono">
                  <span className="text-[9px] text-amber-400 font-bold uppercase">Calorías</span>
                  <span className="font-bold text-xs text-white mt-0.5">{Math.round(totalCals)}</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 p-2 rounded-xl border border-white/5 font-mono">
                  <span className="text-[9px] text-blue-400 font-bold uppercase">Proteínas</span>
                  <span className="font-bold text-xs text-white mt-0.5">{Math.round(totalProt)}g</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 p-2 rounded-xl border border-white/5 font-mono">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase">Carbos</span>
                  <span className="font-bold text-xs text-white mt-0.5">{Math.round(totalCarbs)}g</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 p-2 rounded-xl border border-white/5 font-mono">
                  <span className="text-[9px] text-purple-400 font-bold uppercase">Grasas</span>
                  <span className="font-bold text-xs text-white mt-0.5">{Math.round(totalFats)}g</span>
                </div>
              </div>
            </div>

            {/* Meal groups list */}
            <div className="space-y-4">
              {mealsList.map((meal) => {
                const entries = data[meal] || [];
                const mealCals = entries.reduce((acc: number, curr: any) => acc + (curr.macros?.calories || 0), 0);

                return (
                  <div key={meal} className="overflow-hidden border border-white/10 rounded-[2rem] bg-white/[0.03]">
                    <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-sm">
                          {meal === "Desayuno" && "🌅"}
                          {meal === "Almuerzo" && "☀️"}
                          {meal === "Merienda" && "☕"}
                          {meal === "Cena" && "🌙"}
                        </div>
                        <h3 className="font-semibold text-sm text-slate-200">{getMealName(meal)}</h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-slate-400">
                          {Math.round(mealCals)} kcal
                        </span>
                        <button
                          onClick={() => setAddingMeal(meal)}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-slate-950 flex items-center justify-center text-slate-300 transition-all border border-white/15 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      {entries.length === 0 ? (
                        <p className="text-center text-[11px] text-slate-500 py-3 font-mono">Sin registros en {getMealName(meal)}</p>
                      ) : (
                        <ul className="space-y-2">
                          {entries.map((entry: any) => (
                            <li key={entry.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center group">
                              <div className="flex-1 pr-2 min-w-0">
                                <p className="font-semibold text-xs text-white truncate">{entry.name} <span className="text-[10px] font-normal text-slate-400 ml-1 font-mono">({entry.grams}g)</span></p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {Math.round(entry.macros.calories)} kcal • P:{Math.round(entry.macros.protein)}g C:{Math.round(entry.macros.carbs)}g G:{Math.round(entry.macros.fats)}g
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  onClick={() => setEditingEntry({
                                    id: entry.id,
                                    name: entry.name,
                                    grams: entry.grams,
                                    calories: Math.round(entry.macros.calories),
                                    protein: entry.macros.protein,
                                    carbs: entry.macros.carbs,
                                    fats: entry.macros.fats
                                  })}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL DIALOG */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-300">Editar Alimento ({date})</h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Nombre</label>
                <Input
                  value={editingEntry.name}
                  onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={editingEntry.grams}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grams: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={editingEntry.calories}
                    onChange={(e) => setEditingEntry({ ...editingEntry, calories: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.protein}
                    onChange={(e) => setEditingEntry({ ...editingEntry, protein: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.carbs}
                    onChange={(e) => setEditingEntry({ ...editingEntry, carbs: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.fats}
                    onChange={(e) => setEditingEntry({ ...editingEntry, fats: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2 border-t border-white/5">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-mono hover:bg-white/5 text-slate-300 cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 hover:brightness-110 text-white text-xs font-display font-bold cursor-pointer"
                >
                  GUARDAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD DIALOG MODAL */}
      {addingMeal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-300">Añadir a {getMealName(addingMeal)} ({date})</h3>
              <button onClick={() => setAddingMeal(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Nombre del Alimento</label>
                <Input
                  placeholder="Ej. Pollo con arroz"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={addForm.grams}
                    onChange={(e) => setAddForm({ ...addForm, grams: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={addForm.calories}
                    onChange={(e) => setAddForm({ ...addForm, calories: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.protein}
                    onChange={(e) => setAddForm({ ...addForm, protein: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.carbs}
                    onChange={(e) => setAddForm({ ...addForm, carbs: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 text-center block mb-1">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.fats}
                    onChange={(e) => setAddForm({ ...addForm, fats: e.target.value })}
                    className="bg-black/60 border-white/10 text-white h-9 rounded-xl focus:border-blue-500 text-center font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2 border-t border-white/5">
                <button
                  onClick={() => setAddingMeal(null)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-mono hover:bg-white/5 text-slate-300 cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleSaveAdd}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 hover:brightness-110 text-white text-xs font-display font-bold cursor-pointer"
                >
                  AÑADIR LOG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
