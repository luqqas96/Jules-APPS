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
    <main className="min-h-screen bg-background text-foreground relative overflow-x-hidden pb-28">

      <div className="max-w-md mx-auto px-4 pt-4">
        
        {/* Navigation/Header Bar */}
        <header className="flex justify-between items-center p-5 mb-6 border border-border bg-surface-secondary rounded-2xl">
          <div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Historial</h1>
            <p className="text-base font-bold tracking-tight text-foreground">{activeProfile}</p>
          </div>
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-foreground hover:bg-surface-secondary text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} />
            <span>{resyncing ? 'Resincronizando…' : 'Resincronizar'}</span>
          </button>
        </header>

        {/* Date Selector */}
        <div className="bg-surface border border-border p-5 rounded-[2rem] mb-6 flex flex-col space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Seleccioná una fecha</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-center font-bold text-base h-11 bg-surface-secondary border-border text-foreground rounded-xl focus:border-pixel-mint"
          />
        </div>

        {loading && (
          <div className="text-center text-muted-foreground animate-pulse mt-10 text-xs font-mono uppercase tracking-widest">
            Cargando registros…
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-[1.5rem] text-center text-xs font-mono">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            
            {/* Day Summary Card */}
            <div className="bg-surface border border-border p-5 rounded-[2rem]">
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-4">Resumen de Consumo ({date})</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center bg-surface-secondary p-2 rounded-xl border border-border font-mono">
                  <span className="text-[9px] text-pixel-peach font-bold uppercase">Calorías</span>
                  <span className="font-bold text-xs text-foreground mt-0.5">{Math.round(totalCals)}</span>
                </div>
                <div className="flex flex-col items-center bg-surface-secondary p-2 rounded-xl border border-border font-mono">
                  <span className="text-[9px] text-pixel-blue font-bold uppercase">Proteínas</span>
                  <span className="font-bold text-xs text-foreground mt-0.5">{Math.round(totalProt)}g</span>
                </div>
                <div className="flex flex-col items-center bg-surface-secondary p-2 rounded-xl border border-border font-mono">
                  <span className="text-[9px] text-pixel-mint font-bold uppercase">Carbos</span>
                  <span className="font-bold text-xs text-foreground mt-0.5">{Math.round(totalCarbs)}g</span>
                </div>
                <div className="flex flex-col items-center bg-surface-secondary p-2 rounded-xl border border-border font-mono">
                  <span className="text-[9px] text-pixel-lavender font-bold uppercase">Grasas</span>
                  <span className="font-bold text-xs text-foreground mt-0.5">{Math.round(totalFats)}g</span>
                </div>
              </div>
            </div>

            {/* Meal groups list */}
            <div className="space-y-4">
              {mealsList.map((meal) => {
                const entries = data[meal] || [];
                const mealCals = entries.reduce((acc: number, curr: any) => acc + (curr.macros?.calories || 0), 0);

                return (
                  <div key={meal} className="overflow-hidden border border-border rounded-[2rem] bg-surface">
                    <div className="p-4 flex items-center justify-between border-b border-border bg-surface-secondary">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-surface-secondary border border-border flex items-center justify-center text-sm">
                          {meal === "Desayuno" && "🌅"}
                          {meal === "Almuerzo" && "☀️"}
                          {meal === "Merienda" && "☕"}
                          {meal === "Cena" && "🌙"}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">{getMealName(meal)}</h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {Math.round(mealCals)} kcal
                        </span>
                        <button
                          onClick={() => setAddingMeal(meal)}
                          className="w-7 h-7 rounded-full bg-surface-secondary hover:bg-pixel-mint hover:text-white flex items-center justify-center text-foreground transition-all border border-border cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      {entries.length === 0 ? (
                        <p className="text-center text-[11px] text-muted-foreground py-3 font-mono">Sin registros en {getMealName(meal)}</p>
                      ) : (
                        <ul className="space-y-2">
                          {entries.map((entry: any) => (
                            <li key={entry.id} className="bg-surface-secondary border border-border p-3 rounded-2xl flex justify-between items-center group">
                              <div className="flex-1 pr-2 min-w-0">
                                <p className="font-semibold text-xs text-foreground truncate">{entry.name} <span className="text-[10px] font-normal text-muted-foreground ml-1 font-mono">({entry.grams}g)</span></p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
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
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded-[2rem] overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-foreground">Editar alimento ({date})</h3>
              <button onClick={() => setEditingEntry(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Nombre</label>
                <Input
                  value={editingEntry.name}
                  onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                  className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={editingEntry.grams}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grams: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={editingEntry.calories}
                    onChange={(e) => setEditingEntry({ ...editingEntry, calories: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.protein}
                    onChange={(e) => setEditingEntry({ ...editingEntry, protein: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.carbs}
                    onChange={(e) => setEditingEntry({ ...editingEntry, carbs: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.fats}
                    onChange={(e) => setEditingEntry({ ...editingEntry, fats: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2 border-t border-border">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-mono hover:bg-surface-secondary text-foreground cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 rounded-xl bg-pixel-mint hover:brightness-95 text-white text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded-[2rem] overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-foreground">Añadir a {getMealName(addingMeal)} ({date})</h3>
              <button onClick={() => setAddingMeal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Nombre del alimento</label>
                <Input
                  placeholder="Ej. Pollo con arroz"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={addForm.grams}
                    onChange={(e) => setAddForm({ ...addForm, grams: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={addForm.calories}
                    onChange={(e) => setAddForm({ ...addForm, calories: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.protein}
                    onChange={(e) => setAddForm({ ...addForm, protein: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.carbs}
                    onChange={(e) => setAddForm({ ...addForm, carbs: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground text-center block mb-1">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.fats}
                    onChange={(e) => setAddForm({ ...addForm, fats: e.target.value })}
                    className="bg-surface-secondary border-border text-foreground h-9 rounded-xl focus:border-pixel-mint text-center font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2 border-t border-border">
                <button
                  onClick={() => setAddingMeal(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-mono hover:bg-surface-secondary text-foreground cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleSaveAdd}
                  className="flex-1 py-2 rounded-xl bg-pixel-mint hover:brightness-95 text-white text-xs font-semibold cursor-pointer"
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
