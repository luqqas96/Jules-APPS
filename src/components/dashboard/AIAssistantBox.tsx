"use client";

import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function AIAssistantBox() {
  const { dailyData, updateAllMeals } = useAppContext();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleModify = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentMeals: dailyData.meals
        })
      });

      const data = await res.json();
      if (res.ok) {
        updateAllMeals(data);
        setPrompt("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Error de conexión con el asistente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 p-4 border-none shadow-sm bg-gradient-to-r from-pixel-mint-light to-pixel-blue-light">
      <div className="flex items-center space-x-2 mb-3 text-pixel-foreground font-semibold">
        <SparklesIcon className="w-5 h-5 text-pixel-blue" />
        <span>Asistente Inteligente</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        Pide ajustar porciones (ej. &quot;Comí la mitad del mantecol&quot;), sumar nuevos alimentos o corregir errores usando lenguaje natural.
      </p>
      <div className="flex space-x-2">
        <Input
          className="bg-surface border-transparent shadow-sm flex-1 text-sm h-10 rounded-xl"
          placeholder="Ej: El mantecol del almuerzo fue de 55g..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleModify()}
          disabled={loading}
        />
        <Button
          variant="default"
          className="h-10 px-4 rounded-xl shadow-sm"
          onClick={handleModify}
          disabled={loading}
        >
          {loading ? "..." : "Enviar"}
        </Button>
      </div>
    </Card>
  );
}