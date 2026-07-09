"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { PencilSquareIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

export function FoodDictionaryCard() {
  const { activeProfile, foodHistory, refreshFoodHistory } = useAppContext();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "" });

  const [editingItem, setEditingItem] = useState<{
    originalName: string;
    name: string;
    calories: number | string;
    protein: number | string;
    carbs: number | string;
    fats: number | string;
  } | null>(null);

  const filteredHistory = foodHistory.filter(item =>
    item.name && item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${name}" del diccionario?`)) return;
    try {
      await supabase.from('food_history').delete().eq('profile', activeProfile).eq('name', name);
      await refreshFoodHistory();
    } catch (e) {
      alert("Error al eliminar del diccionario.");
    }
  };

  const handleSaveAdd = async () => {
    if (!addForm.name.trim()) return;
    try {
      await supabase.from('food_history').upsert({
        profile: activeProfile,
        name: addForm.name.trim(),
        base_macros: {
          calories: Number(addForm.calories) || 0,
          protein: Number(addForm.protein) || 0,
          carbs: Number(addForm.carbs) || 0,
          fats: Number(addForm.fats) || 0,
        }
      }, { onConflict: 'profile,name' });
      setShowAdd(false);
      setAddForm({ name: "", calories: "", protein: "", carbs: "", fats: "" });
      await refreshFoodHistory();
    } catch (e) {
      alert("Error al añadir al diccionario.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    try {
      // Si cambió el nombre, eliminamos el anterior y creamos el nuevo
      if (editingItem.originalName !== editingItem.name.trim()) {
        await supabase.from('food_history').delete().eq('profile', activeProfile).eq('name', editingItem.originalName);
      }
      await supabase.from('food_history').upsert({
        profile: activeProfile,
        name: editingItem.name.trim(),
        base_macros: {
          calories: Number(editingItem.calories) || 0,
          protein: Number(editingItem.protein) || 0,
          carbs: Number(editingItem.carbs) || 0,
          fats: Number(editingItem.fats) || 0,
        }
      }, { onConflict: 'profile,name' });
      setEditingItem(null);
      await refreshFoodHistory();
    } catch (e) {
      alert("Error al guardar cambios del alimento.");
    }
  };

  return (
    <Card className="border border-border/60 shadow-sm bg-surface overflow-hidden">
      <CardHeader className="pb-3 border-b border-surface-secondary flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center space-x-2">
          <span>📖 Diccionario de Alimentos</span>
          <span className="text-xs font-normal text-muted-foreground bg-surface-secondary px-2.5 py-0.5 rounded-full">
            {foodHistory.length}
          </span>
        </CardTitle>
        <Button
          variant="mint"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="h-8 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
        >
          <PlusIcon className="w-3.5 h-3.5 mr-1" />
          <span>Nuevo</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar en tu diccionario base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-surface-secondary border-none"
          />
        </div>

        <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              {search ? "No se encontraron alimentos con esa búsqueda." : "Tu diccionario está vacío."}
            </p>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.name}
                className="bg-surface-secondary/70 hover:bg-surface-secondary p-3 rounded-xl flex items-center justify-between border border-border/40 transition-colors"
              >
                <div className="flex-1 pr-2">
                  <p className="font-semibold text-xs text-foreground line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {Math.round(item.baseMacros?.calories || 0)} kcal/100g • P: {item.baseMacros?.protein || 0}g • C: {item.baseMacros?.carbs || 0}g • G: {item.baseMacros?.fats || 0}g
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingItem({
                      originalName: item.name,
                      name: item.name,
                      calories: Math.round(item.baseMacros?.calories || 0),
                      protein: item.baseMacros?.protein || 0,
                      carbs: item.baseMacros?.carbs || 0,
                      fats: item.baseMacros?.fats || 0
                    })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                    title="Editar macros/nombre"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.name)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar del diccionario"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* MODAL / FORM CREAR NUEVO ALIMENTO */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-surface shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Crear Alimento Base (/100g)</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nombre / Marca</label>
                <Input
                  placeholder="Ej. Pan Integral Bimbo"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="font-medium h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Calorías / 100g</label>
                  <Input
                    type="number"
                    placeholder="Ej. 250"
                    value={addForm.calories}
                    onChange={(e) => setAddForm({ ...addForm, calories: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Proteína / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 9.5"
                    value={addForm.protein}
                    onChange={(e) => setAddForm({ ...addForm, protein: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Carbos / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 45"
                    value={addForm.carbs}
                    onChange={(e) => setAddForm({ ...addForm, carbs: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Grasas / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 3.2"
                    value={addForm.fats}
                    onChange={(e) => setAddForm({ ...addForm, fats: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-secondary text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdd}
                  className="flex-1 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 shadow-sm"
                >
                  Guardar en Diccionario
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM EDITAR ALIMENTO */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-surface shadow-xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-surface-secondary flex items-center justify-between border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Editar Alimento Base (/100g)</h3>
              <button onClick={() => setEditingItem(null)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Nombre / Marca</label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="font-medium h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Calorías / 100g</label>
                  <Input
                    type="number"
                    value={editingItem.calories}
                    onChange={(e) => setEditingItem({ ...editingItem, calories: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Proteína / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.protein}
                    onChange={(e) => setEditingItem({ ...editingItem, protein: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Carbos / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.carbs}
                    onChange={(e) => setEditingItem({ ...editingItem, carbs: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Grasas / 100g (g)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.fats}
                    onChange={(e) => setEditingItem({ ...editingItem, fats: e.target.value })}
                    className="font-medium h-9 text-sm"
                  />
                </div>
              </div>
              <div className="pt-3 flex space-x-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-secondary text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 shadow-sm"
                >
                  Actualizar Alimento
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
