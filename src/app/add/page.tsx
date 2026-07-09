"use client";
import { getMealName } from "@/lib/translations";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PencilSquareIcon, PencilIcon, QrCodeIcon, MagnifyingGlassIcon, XMarkIcon, SparklesIcon, CameraIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "@/contexts/AppContext";
import { MealType, FoodEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import BarcodeScanner from "@/components/add/BarcodeScanner";

type InputMode = "text" | "barcode" | "manual" | "lens";

function AddFoodForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealParam = searchParams.get("meal") as MealType | null;
  const initialMeal = mealParam || "Desayuno";

  const { addEntry, foodHistory } = useAppContext();

  const [dictionary, setDictionary] = useState<any[]>([]);
  const [mode, setMode] = useState<InputMode>("text");
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Partial<FoodEntry> | null>(null);
  const [searchResultsList, setSearchResultsList] = useState<Partial<FoodEntry>[] | null>(null);
  const [grams, setGrams] = useState<string>("100");
  const [manualForm, setManualForm] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "" });
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResults(null);
    setSearchResultsList(null);
    setLastScannedBarcode(null);
    setLastScannedName(null);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Resize max 800px width/height
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const base64DataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const base64 = base64DataUrl.split(',')[1];

          try {
             const res = await fetch('/api/ai/lens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' })
             });
             const data = await res.json();
             if (res.ok) {
                setResults(data);
                setGrams(data.estimatedGrams ? String(data.estimatedGrams) : "100");
             } else {
                alert(data.error || "Error al analizar imagen.");
             }
          } catch (err) {
             alert("Error de conexión con IA visual.");
          } finally {
             setLoading(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Error al leer archivo.");
      setLoading(false);
    }
  };


  const handleTextSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setResults(null);
    setSearchResultsList(null);
    
    // Normalize string: remove accents, to lower case
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const query = normalize(searchQuery);
    const uniqueFoods = new Map<string, Partial<FoodEntry>>();
    
    // 1. Buscar en el historial local primero
    if (foodHistory && foodHistory.length > 0) {
      foodHistory.forEach(item => {
        if (normalize(item.name).includes(query)) {
          if (!uniqueFoods.has(normalize(item.name))) {
            uniqueFoods.set(normalize(item.name), { name: item.name, macros: item.baseMacros });
          }
        }
      });
    }

    const resultsArray = Array.from(uniqueFoods.values());
    
    if (resultsArray.length > 0) {
      setSearchResultsList(resultsArray);
      setLoading(false);
    } else {
      // 2. Si no hay en historial, buscar en internet (OpenFoodFacts)
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setSearchResultsList(data);
        } else if (res.ok && !Array.isArray(data)) {
          setResults(data);
          setGrams("100");
        } else {
          alert(data.error || "No se encontró el alimento en la base de datos de internet.");
        }
      } catch (e) {
        alert("Error de conexión al buscar en internet.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectSearchResult = (item: Partial<FoodEntry>) => {
    setResults(item);
    setSearchResultsList(null);
    setGrams("100");
  };

  const handleBarcodeFallback = async (productName: string) => {
    setLoading(true);
    setResults(null);
    try {
      const url = `/api/food/barcode-fallback?name=${encodeURIComponent(productName)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setSearchResultsList(null);
        setGrams("100");
      } else {
        alert(data.error || "No se pudo encontrar el producto en la API alternativa.");
      }
    } catch (e) {
      alert("Error de conexión al usar la API alternativa.");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeResult = async (barcode: string) => {
    setMode("text"); // stop scanner
    setLoading(true);
    setResults(null);
    setSearchQuery(`Código: ${barcode}`);
    setLastScannedBarcode(barcode);

    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      
      const isOk = res.ok;
      const isZeros = data.macros && data.macros.calories === 0 && data.macros.protein === 0 && data.macros.carbs === 0 && data.macros.fats === 0;

      if (isOk) {
         setLastScannedName(data.name || null);
      } else {
         setLastScannedName(null);
      }

      if (isOk && !isZeros) {
        setResults(data);
        setSearchResultsList(null);
        setGrams("100");
      } else {
        // Input Manual + IA Fallback
        const productName = window.prompt("No se encontró el producto o no tiene datos nutricionales.\n\nPor favor, escribe el nombre del producto (ej. 'Galletas Oreo') y la IA calculará los macros automáticamente:", data.name || "");
        if (productName && productName.trim() !== "") {
           handleBarcodeFallback(productName.trim());
        } else {
           alert("Búsqueda cancelada.");
        }
      }
    } catch (e) {
      alert("Connection error");
    } finally {
      setLoading(false);
    }
  };


  const saveEntry = () => {
    if (results && results.macros && results.name) {
      const parsedGrams = parseFloat(grams) || 0;
      const multiplier = parsedGrams / 100;
      const scaledMacros = {
        calories: Math.round(results.macros.calories * multiplier),
        protein: Number((results.macros.protein * multiplier).toFixed(1)),
        carbs: Number((results.macros.carbs * multiplier).toFixed(1)),
        fats: Number((results.macros.fats * multiplier).toFixed(1)),
        cholesterol: Number(((results.macros.cholesterol || 0) * multiplier).toFixed(1)),
        sodium: Number(((results.macros.sodium || 0) * multiplier).toFixed(1)),
        sugar: Number(((results.macros.sugar || 0) * multiplier).toFixed(1)),
        calcium: Number(((results.macros.calcium || 0) * multiplier).toFixed(1)),
      };

      const displayName = parsedGrams !== 100 ? `${results.name} (${parsedGrams}g)` : results.name;

      addEntry(meal, { name: displayName, macros: scaledMacros, baseMacros: results.macros, grams: parsedGrams });
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
          <h1 className="text-xl font-semibold">Add Food</h1>
        </div>
        <select
          className="bg-surface-secondary border-none text-sm font-medium rounded-full px-3 py-1.5 focus:ring-0 cursor-pointer"
          value={meal}
          onChange={(e) => setMeal(e.target.value as MealType)}
        >
          <option value="Desayuno">Breakfast</option>
          <option value="Almuerzo">Lunch</option>
          <option value="Merienda">Snack</option>
          <option value="Cena">Dinner</option>
        </select>
      </div>

      <div className="flex bg-surface-secondary p-1 rounded-full mb-6">
        <button
          className={`flex-1 flex justify-center items-center py-2 text-xs font-medium rounded-full transition-colors ${mode === "text" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("text")}
        >
          <MagnifyingGlassIcon className="w-4 h-4 mr-1" /> Buscar
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-2 text-xs font-medium rounded-full transition-colors ${mode === "lens" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("lens")}
        >
          <CameraIcon className="w-4 h-4 mr-1" /> Lens
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-2 text-xs font-medium rounded-full transition-colors ${mode === "barcode" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("barcode")}
        >
          <QrCodeIcon className="w-4 h-4 mr-1" /> Escanear
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-2 text-xs font-medium rounded-full transition-colors ${mode === "manual" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("manual")}
        >
          <PencilSquareIcon className="w-4 h-4 mr-1" /> Propio
        </button>
      </div>


      {mode === "text" && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search for food or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
            />
            <Button variant="mint" onClick={handleTextSearch}>Search</Button>
          </div>
        </div>
      )}



      {!loading && mode === "text" && !results && dictionary.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Previous products for {getMealName(meal)}:</label>
          <select
            className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pixel-mint/50"
            onChange={(e) => {
              if (!e.target.value) return;
              const selected = dictionary[parseInt(e.target.value)];
              if (selected) {
                handleSelectSearchResult({ name: selected.name, macros: selected.baseMacros });
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Select a previously consumed product...</option>
            {dictionary.map((item, idx) => (
              <option key={idx} value={idx}>{item.name}</option>
            ))}
          </select>
        </div>
      )}

      {!loading && mode === "text" && !results && (!searchResultsList || searchResultsList.length === 0) && foodHistory && foodHistory.length > 0 && (
        <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent:</h3>
          {foodHistory.map((item, idx) => (
            <Card key={idx} className="cursor-pointer hover:bg-surface-secondary transition-colors" onClick={() => handleSelectSearchResult({ name: item.name, macros: item.baseMacros })}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                  <div className="flex space-x-3 mt-1 text-xs text-muted-foreground">
                    <span>{Number(item.baseMacros?.calories || 0).toFixed(2).replace(/\.?0+$/, '')} kcal</span>
                    <span>P: {Number(item.baseMacros?.protein || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                    <span>C: {Number(item.baseMacros?.carbs || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                    <span>G: {Number(item.baseMacros?.fats || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right w-16">
                  per 100g
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}



      {mode === "manual" && !results && (
        <Card className="mt-4 bg-surface animate-in fade-in">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg text-center mb-2">Create Custom Food</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">Enter nutritional values per 100g (or 1 base portion).</p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input
                placeholder="e.g. Homemade Cake"
                value={manualForm.name}
                onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
              />
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Calories (kcal)</label>
                <Input type="number" step="0.1" min="0" value={manualForm.calories} onChange={(e) => setManualForm({...manualForm, calories: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Protein (g)</label>
                <Input type="number" step="0.1" min="0" value={manualForm.protein} onChange={(e) => setManualForm({...manualForm, protein: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Carbs (g)</label>
                <Input type="number" step="0.1" min="0" value={manualForm.carbs} onChange={(e) => setManualForm({...manualForm, carbs: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fats (g)</label>
                <Input type="number" step="0.1" min="0" value={manualForm.fats} onChange={(e) => setManualForm({...manualForm, fats: e.target.value})} />
              </div>
            </div>

            <Button
              className="w-full mt-4"
              variant="mint"
              disabled={!manualForm.name}
              onClick={() => {
                setResults({
                  name: manualForm.name,
                  macros: {
                    calories: parseFloat(manualForm.calories) || 0,
                    protein: parseFloat(manualForm.protein) || 0,
                    carbs: parseFloat(manualForm.carbs) || 0,
                    fats: parseFloat(manualForm.fats) || 0
                  }
                });
                setGrams("100");
              }}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}


      {mode === "barcode" && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-sm text-center text-muted-foreground mb-4">Apunta tu cámara al código de barras.</p>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
             <BarcodeScanner onResult={handleBarcodeResult} />
          </div>
        </div>
      )}

      {mode === "lens" && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 text-center">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mb-4">
               <CameraIcon className="w-8 h-8 text-pixel-mint" />
            </div>
            <h3 className="font-medium text-lg text-foreground">Inteligencia Artificial Visual</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">
              Toma una foto a tu plato de comida o empaque. Gemini Vision identificará qué es y calculará sus nutrientes.
            </p>
          </div>
          <Button variant="mint" size="lg" className="relative overflow-hidden group">
            <CameraIcon className="w-5 h-5 mr-2" />
            <span>Abrir Cámara / Galería</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {loading && (
        <div className="mt-8 text-center animate-pulse text-muted-foreground">
          Searching for nutritional information...
        </div>
      )}

      {!loading && searchResultsList && searchResultsList.length > 0 && mode === "text" && !results && (
        <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Select an option:</h3>
          {searchResultsList.map((item, idx) => (
            <Card key={idx} className="cursor-pointer hover:bg-surface-secondary transition-colors" onClick={() => handleSelectSearchResult(item)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                  <div className="flex space-x-3 mt-1 text-xs text-muted-foreground">
                    <span>{Number(item.macros?.calories || 0).toFixed(2).replace(/\.?0+$/, '')} kcal</span>
                    <span>P: {Number(item.macros?.protein || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                    <span>C: {Number(item.macros?.carbs || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                    <span>G: {Number(item.macros?.fats || 0).toFixed(2).replace(/\.?0+$/, '')}g</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right w-16">
                  per 100g
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && !loading && (
        <Card className="mt-8 bg-surface animate-in fade-in slide-in-from-bottom-4 shadow-md border-border">
          <CardContent className="p-6">
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nombre del Plato / Producto (Editable)</label>
              <Input
                value={results.name || ""}
                onChange={(e) => setResults({ ...results, name: e.target.value })}
                className="font-semibold text-md h-11 bg-background"
              />
            </div>

            {(results as any).description && (
              <div className="mb-4 p-3.5 bg-pixel-mint-light/40 border border-pixel-mint/30 rounded-2xl text-xs text-foreground/90 space-y-1.5 shadow-sm">
                <div className="font-semibold text-pixel-mint flex items-center space-x-1 text-sm">
                  <span>✨ Análisis Visual con IA</span>
                </div>
                <p className="leading-relaxed">{(results as any).description}</p>
                {(results as any).estimatedGrams && (
                  <div className="pt-1 flex items-center justify-between text-xs font-medium text-foreground">
                    <span>Peso total detectado por IA: {(results as any).estimatedGrams}g</span>
                    <button
                      type="button"
                      onClick={() => setGrams(String((results as any).estimatedGrams))}
                      className="text-pixel-mint underline font-bold"
                    >
                      Usar porción detectada ({(results as any).estimatedGrams}g)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Macros Base por 100g (Editable)</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block text-center font-medium">Kcal/100g</label>
                <Input
                  type="number"
                  step="1"
                  value={Math.round(results.macros?.calories ?? 0)}
                  onChange={(e) => setResults({
                    ...results,
                    macros: { ...results.macros!, calories: parseFloat(e.target.value) || 0 }
                  })}
                  className="h-10 text-center font-bold text-sm bg-surface-secondary border-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block text-center font-medium">Prot/100g</label>
                <Input
                  type="number"
                  step="0.1"
                  value={results.macros?.protein ?? 0}
                  onChange={(e) => setResults({
                    ...results,
                    macros: { ...results.macros!, protein: parseFloat(e.target.value) || 0 }
                  })}
                  className="h-10 text-center font-bold text-sm bg-surface-secondary border-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block text-center font-medium">Carb/100g</label>
                <Input
                  type="number"
                  step="0.1"
                  value={results.macros?.carbs ?? 0}
                  onChange={(e) => setResults({
                    ...results,
                    macros: { ...results.macros!, carbs: parseFloat(e.target.value) || 0 }
                  })}
                  className="h-10 text-center font-bold text-sm bg-surface-secondary border-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block text-center font-medium">Grasa/100g</label>
                <Input
                  type="number"
                  step="0.1"
                  value={results.macros?.fats ?? 0}
                  onChange={(e) => setResults({
                    ...results,
                    macros: { ...results.macros!, fats: parseFloat(e.target.value) || 0 }
                  })}
                  className="h-10 text-center font-bold text-sm bg-surface-secondary border-none"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between bg-surface-secondary p-3.5 rounded-2xl border border-border">
              <label className="text-sm font-semibold text-foreground">Porción a registrar:</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="w-24 text-center font-bold text-base h-10 bg-background shadow-sm"
                />
                <span className="text-sm font-bold text-foreground">g</span>
              </div>
            </div>

            <div className="mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Calculado para {grams || 0}g</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-pixel-mint-light p-3.5 rounded-2xl">
                <p className="text-xs text-muted-foreground">Calorías Totales</p>
                <p className="font-bold text-xl text-foreground">{Math.round((results.macros?.calories || 0) * ((parseFloat(grams) || 0) / 100))} <span className="text-sm font-normal">kcal</span></p>
              </div>
              <div className="bg-pixel-peach-light p-3.5 rounded-2xl">
                <p className="text-xs text-muted-foreground">Proteína Total</p>
                <p className="font-bold text-xl text-foreground">{((results.macros?.protein || 0) * ((parseFloat(grams) || 0) / 100)).toFixed(1)} <span className="text-sm font-normal">g</span></p>
              </div>
              <div className="bg-pixel-blue-light p-3.5 rounded-2xl">
                <p className="text-xs text-muted-foreground">Carbohidratos Totales</p>
                <p className="font-bold text-xl text-foreground">{((results.macros?.carbs || 0) * ((parseFloat(grams) || 0) / 100)).toFixed(1)} <span className="text-sm font-normal">g</span></p>
              </div>
              <div className="bg-pixel-lavender-light p-3.5 rounded-2xl">
                <p className="text-xs text-muted-foreground">Grasas Totales</p>
                <p className="font-bold text-xl text-foreground">{((results.macros?.fats || 0) * ((parseFloat(grams) || 0) / 100)).toFixed(1)} <span className="text-sm font-normal">g</span></p>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full font-bold shadow-md" size="lg" variant="mint" onClick={saveEntry}>
                Añadir a {getMealName(meal)}
              </Button>
              {lastScannedBarcode && (
                <Button className="w-full bg-surface-secondary text-foreground hover:bg-surface border border-border text-xs" size="lg" variant="outline" onClick={() => {
                   const productName = window.prompt("Calcular con IA Manual.\n\nEscribe el nombre del producto:", lastScannedName || "");
                   if (productName && productName.trim() !== "") {
                      handleBarcodeFallback(productName.trim());
                   }
                }}>
                  Contrastar con IA (API Alternativa)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <AddFoodForm />
    </Suspense>
  );
}