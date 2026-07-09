"use client";
import { getMealName } from "@/lib/translations";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MealType } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { PencilSquareIcon, TrashIcon, PlusIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
        setError(json.error || "Error retrieving data.");
      }
    } catch (e: unknown) {
      setError("Connection error loading history.");
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
        alert(`¡Fecha ${date} resincronizada exitosamente con Google Sheets!`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al resincronizar con Google Sheets.");
      }
    } catch (e) {
      alert("Error de conexión al resincronizar.");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-border/50 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Historial y Edición</h1>
        <button
          onClick={handleResync}
          disabled={resyncing}
          className="flex items-center space-x-1.5 text-xs font-semibold bg-surface-secondary text-foreground px-3 py-1.5 rounded-full hover:bg-surface border border-border shadow-sm transition-all"
        >
          <ArrowPathIcon className={`w-4 h-4 ${resyncing ? 'animate-spin' : ''}`} />
          <span>{resyncing ? 'Sincronizando...' : 'Resincronizar Sheets'}</span>
        </button>
      </header>

      <div className="p-4 max-w-md mx-auto mt-2">
        <div className="bg-surface p-4 rounded-2xl shadow-sm mb-6 flex flex-col space-y-2 border border-border/60">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seleccionar Fecha</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-center font-bold text-base h-12 bg-background"
          />
        </div>

        {loading && (
          <div className="text-center text-muted-foreground animate-pulse mt-10 text-sm font-medium">
            Cargando registros de la base de datos...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <Card className="mb-6 bg-surface shadow-sm border border-border/60">
              <CardContent className="p-5">
                <h3 className="font-semibold text-center mb-4 text-xs text-muted-foreground uppercase tracking-wider">Resumen Diario ({date})</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center bg-pixel-mint-light/50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Calorías</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalCals)}</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-peach-light/50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Proteína</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalProt)}g</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-blue-light/50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Carbos</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalCarbs)}g</span>
                  </div>
                  <div className="flex flex-col items-center bg-pixel-lavender-light/50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Grasas</span>
                    <span className="font-bold text-sm text-foreground">{Math.round(totalFats)}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {mealsList.map((meal) => {
                const entries = data[meal] || [];
                const mealCals = entries.reduce((acc: number, curr: any) => acc + (curr.macros?.calories || 0), 0);

                return (
                  <Card key={getMealName(meal)} className="overflow-hidden border border-border/60 shadow-sm bg-surface">
                    <div className="p-4 flex items-center justify-between border-b border-surface-secondary">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-pixel-mint-light flex items-center justify-center text-pixel-mint text-sm">
                          {meal === "Desayuno" && "🌅"}
                          {meal === "Almuerzo" && "☀️"}
                          {meal === "Merienda" && "☕"}
                          {meal === "Cena" && "🌙"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-md leading-tight text-foreground">{getMealName(meal)}</h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {Math.round(mealCals)} kcal
                        </span>
                        <button
                          onClick={() => setAddingMeal(meal)}
                          className="w-7 h-7 rounded-full bg-surface-secondary hover:bg-pixel-mint hover:text-white flex items-center justify-center text-foreground transition-all shadow-sm"
                          title="Añadir alimento a esta comida"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      {entries.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-3">No hay alimentos registrados en {getMealName(meal)}</p>
                      ) : (
                        <ul className="space-y-2">
                          {entries.map((entry: any) => (
                            <li key={entry.id} className="bg-surface-secondary p-3 rounded-xl flex justify-between items-center group">
                              <div className="flex-1 pr-2">
                                <p className="font-semibold text-sm line-clamp-1 text-foreground">{entry.name} <span className="text-xs font-normal text-muted-foreground ml-1">({entry.grams}g)</span></p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {Math.round(entry.macros.calories)} kcal • P: {Math.round(entry.macros.protein)}g • C: {Math.round(entry.macros.carbs)}g • G: {Math.round(entry.macros.fats)}g
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
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
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                                  title="Editar"
                                >
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Eliminar"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL / FORM DE EDICIÓN */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-surface shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Editar Alimento ({date})</h3>
              <button onClick={() => setEditingEntry(null)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nombre</label>
                <Input
                  value={editingEntry.name}
                  onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                  className="font-medium h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={editingEntry.grams}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grams: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={editingEntry.calories}
                    onChange={(e) => setEditingEntry({ ...editingEntry, calories: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.protein}
                    onChange={(e) => setEditingEntry({ ...editingEntry, protein: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.carbs}
                    onChange={(e) => setEditingEntry({ ...editingEntry, carbs: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingEntry.fats}
                    onChange={(e) => setEditingEntry({ ...editingEntry, fats: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-secondary text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM PARA AÑADIR A FECHA HISTÓRICA */}
      {addingMeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-surface shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Añadir a {getMealName(addingMeal)} ({date})</h3>
              <button onClick={() => setAddingMeal(null)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nombre del Alimento</label>
                <Input
                  placeholder="Ej. Pollo con arroz"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="font-medium h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={addForm.grams}
                    onChange={(e) => setAddForm({ ...addForm, grams: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Calorías (kcal)</label>
                  <Input
                    type="number"
                    value={addForm.calories}
                    onChange={(e) => setAddForm({ ...addForm, calories: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Prot (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.protein}
                    onChange={(e) => setAddForm({ ...addForm, protein: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Carb (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.carbs}
                    onChange={(e) => setAddForm({ ...addForm, carbs: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block text-center">Grasa (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={addForm.fats}
                    onChange={(e) => setAddForm({ ...addForm, fats: e.target.value })}
                    className="font-medium h-9 text-sm text-center"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2">
                <button
                  onClick={() => setAddingMeal(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-secondary text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdd}
                  className="flex-1 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 shadow-sm"
                >
                  Añadir al Historial
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
