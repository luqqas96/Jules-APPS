"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function PesoPage() {
  const { dailyData, setDailyWeight } = useAppContext();
  const [weight, setWeight] = useState(dailyData.weight?.value?.toString() || "");

  const handleSave = () => {
    const val = parseFloat(weight);
    if (!isNaN(val) && val > 0) {
      setDailyWeight(val);
      alert("Peso guardado. Se enviará a Google Sheets al finalizar el día.");
    } else {
      alert("Por favor ingresa un peso válido.");
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Peso Diario</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-6">
        <Card className="bg-surface border-none shadow-sm animate-in fade-in">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-pixel-blue-light/50 rounded-full flex items-center justify-center mb-6">
              <span className="text-2xl">⚖️</span>
            </div>

            <h2 className="text-lg font-semibold mb-2">Registra tu peso</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Anota tu peso en ayunas para llevar un control diario.
            </p>

            <div className="flex items-center space-x-3 w-full mb-6">
              <Input
                type="number"
                step="0.1"
                placeholder="Ej. 75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-center text-xl h-14"
              />
              <span className="text-lg font-medium text-muted-foreground">kg</span>
            </div>

            <Button
              className="w-full h-12 text-lg"
              variant="mint"
              onClick={handleSave}
            >
              Guardar Peso
            </Button>

            {dailyData.weight && (
              <div className="mt-6 w-full bg-pixel-mint-light/30 border border-pixel-mint/30 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Último Registro</p>
                    <p className="text-2xl font-bold text-foreground">{dailyData.weight.value} <span className="text-sm font-medium text-muted-foreground">kg</span></p>
                  </div>
                  <div className="text-right">
                    <div className="bg-surface p-2 rounded-xl shadow-sm border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(dailyData.weight.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(dailyData.weight.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
