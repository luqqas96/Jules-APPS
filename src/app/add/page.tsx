"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CameraIcon, QrCodeIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "@/contexts/AppContext";
import { MealType, FoodEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import BarcodeScanner from "@/components/add/BarcodeScanner";

type InputMode = "text" | "barcode" | "photo";

function AddFoodForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealParam = searchParams.get("meal") as MealType | null;
  const initialMeal = mealParam || "Desayuno";

  const { addEntry, foodHistory } = useAppContext();

  const [mode, setMode] = useState<InputMode>("text");
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Partial<FoodEntry> | null>(null);
  const [searchResultsList, setSearchResultsList] = useState<Partial<FoodEntry>[] | null>(null);
  const [grams, setGrams] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setResults(null);
    setSearchResultsList(null);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSearchResultsList(data);
      } else if (res.ok && !Array.isArray(data)) {
        // Fallback si la API devuelve un solo objeto
        setResults(data);
        setGrams(100);
      } else {
        alert(data.error || "Error al buscar");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (item: Partial<FoodEntry>) => {
    setResults(item);
    setSearchResultsList(null);
    setGrams(100);
  };

  const handleBarcodeResult = async (barcode: string) => {
    setMode("text"); // stop scanner
    setLoading(true);
    setResults(null);
    setSearchQuery(`Código: ${barcode}`);
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setSearchResultsList(null);
        setGrams(100);
      } else {
        alert(data.error || "Producto no encontrado");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResults(null);
    setMode("text"); // return to standard view

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/food/vision", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setSearchResultsList(null);
        setGrams(100); // Para imágenes, trataremos el "100" como "100%" o "1 porción"
      } else {
        alert(data.error || "Error al analizar imagen");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = () => {
    if (results && results.macros && results.name) {
      const multiplier = grams / 100;
      const scaledMacros = {
        calories: Math.round(results.macros.calories * multiplier),
        protein: Math.round(results.macros.protein * multiplier),
        carbs: Math.round(results.macros.carbs * multiplier),
        fats: Math.round(results.macros.fats * multiplier),
      };

      const displayName = grams !== 100 ? `${results.name} (${grams}g)` : results.name;

      addEntry(meal, { name: displayName, macros: scaledMacros, baseMacros: results.macros, grams: grams });
      router.push("/");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="-ml-2">
            <XMarkIcon className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-semibold">Agregar Alimento</h1>
        </div>
        <select
          className="bg-surface-secondary border-none text-sm font-medium rounded-full px-3 py-1.5 focus:ring-0 cursor-pointer"
          value={meal}
          onChange={(e) => setMeal(e.target.value as MealType)}
        >
          <option value="Desayuno">Desayuno</option>
          <option value="Almuerzo">Almuerzo</option>
          <option value="Merienda">Merienda</option>
          <option value="Cena">Cena</option>
        </select>
      </div>

      <div className="flex bg-surface-secondary p-1 rounded-full mb-6">
        <button
          className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-full transition-colors ${mode === "text" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("text")}
        >
          <MagnifyingGlassIcon className="w-4 h-4 mr-2" /> Texto
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-full transition-colors ${mode === "barcode" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("barcode")}
        >
          <QrCodeIcon className="w-4 h-4 mr-2" /> Escanear
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-full transition-colors ${mode === "photo" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => {
             setMode("photo");
             fileInputRef.current?.click();
          }}
        >
          <CameraIcon className="w-4 h-4 mr-2" /> Foto
        </button>
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {mode === "text" && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Buscar alimento o marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
            />
            <Button variant="mint" onClick={handleTextSearch}>Buscar</Button>
          </div>
        </div>
      )}


      {!loading && mode === "text" && !results && (!searchResultsList || searchResultsList.length === 0) && foodHistory && foodHistory.length > 0 && (
        <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recientes:</h3>
          {foodHistory.map((item, idx) => (
            <Card key={idx} className="cursor-pointer hover:bg-surface-secondary transition-colors" onClick={() => handleSelectSearchResult({ name: item.name, macros: item.baseMacros })}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                  <div className="flex space-x-3 mt-1 text-xs text-muted-foreground">
                    <span>{item.baseMacros?.calories} kcal</span>
                    <span>P: {item.baseMacros?.protein}g</span>
                    <span>C: {item.baseMacros?.carbs}g</span>
                    <span>G: {item.baseMacros?.fats}g</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right w-16">
                  por 100g
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {mode === "barcode" && (
        <div className="mt-4">
          <p className="text-sm text-center text-muted-foreground mb-4">Apunta la cámara al código de barras del producto.</p>
          <BarcodeScanner onResult={handleBarcodeResult} />
        </div>
      )}

      {loading && (
        <div className="mt-8 text-center animate-pulse text-muted-foreground">
          Buscando información nutricional...
        </div>
      )}

      {!loading && searchResultsList && searchResultsList.length > 0 && mode === "text" && !results && (
        <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Selecciona una opción:</h3>
          {searchResultsList.map((item, idx) => (
            <Card key={idx} className="cursor-pointer hover:bg-surface-secondary transition-colors" onClick={() => handleSelectSearchResult(item)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                  <div className="flex space-x-3 mt-1 text-xs text-muted-foreground">
                    <span>{item.macros?.calories} kcal</span>
                    <span>P: {item.macros?.protein}g</span>
                    <span>C: {item.macros?.carbs}g</span>
                    <span>G: {item.macros?.fats}g</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right w-16">
                  por 100g
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && !loading && (
        <Card className="mt-8 bg-surface animate-in fade-in slide-in-from-bottom-4">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">{results.name}</h3>

            <div className="mb-6 flex items-center space-x-3">
              <label className="text-sm font-medium whitespace-nowrap">Cantidad (g):</label>
              <Input
                type="number"
                min="1"
                value={grams}
                onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-24 text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-pixel-mint-light p-3 rounded-2xl">
                <p className="text-xs text-muted-foreground">Calorías</p>
                <p className="font-bold text-xl">{Math.round((results.macros?.calories || 0) * (grams / 100))} <span className="text-sm font-normal">kcal</span></p>
              </div>
              <div className="bg-pixel-peach-light p-3 rounded-2xl">
                <p className="text-xs text-muted-foreground">Proteínas</p>
                <p className="font-bold text-xl">{Math.round((results.macros?.protein || 0) * (grams / 100))} <span className="text-sm font-normal">g</span></p>
              </div>
              <div className="bg-pixel-blue-light p-3 rounded-2xl">
                <p className="text-xs text-muted-foreground">Carbos</p>
                <p className="font-bold text-xl">{Math.round((results.macros?.carbs || 0) * (grams / 100))} <span className="text-sm font-normal">g</span></p>
              </div>
              <div className="bg-pixel-lavender-light p-3 rounded-2xl">
                <p className="text-xs text-muted-foreground">Grasas</p>
                <p className="font-bold text-xl">{Math.round((results.macros?.fats || 0) * (grams / 100))} <span className="text-sm font-normal">g</span></p>
              </div>
            </div>

            <Button className="w-full" size="lg" variant="mint" onClick={saveEntry}>
              Agregar a {meal}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="p-4">Cargando...</div>}>
      <AddFoodForm />
    </Suspense>
  );
}