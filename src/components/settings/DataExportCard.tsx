"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";

export function DataExportCard() {
  const { activeProfile } = useAppContext();
  const [exportMode, setExportMode] = useState<"all" | "range">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToCSV = (arr: any[]) => {
    if (arr.length === 0) return "";
    const keys = Object.keys(arr[0]);
    const headerRow = keys.join(",");
    const rows = arr.map(row => {
      return keys.map(k => {
        let val = row[k] === null || row[k] === undefined ? "" : String(row[k]);
        if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",");
    });
    return [headerRow, ...rows].join("\n");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let foodQuery = supabase.from("food_logs").select("*").eq("profile", activeProfile);
      let weightQuery = supabase.from("weight_logs").select("*").eq("profile", activeProfile);

      if (exportMode === "range") {
        if (!startDate || !endDate) {
          alert("Por favor, selecciona las fechas de inicio y fin.");
          setIsExporting(false);
          return;
        }
        foodQuery = foodQuery.gte("date", startDate).lte("date", endDate);
        weightQuery = weightQuery.gte("date", startDate).lte("date", endDate);
      }

      const [foodRes, weightRes] = await Promise.all([
        foodQuery.order("date", { ascending: false }),
        weightQuery.order("date", { ascending: false })
      ]);

      if (foodRes.error) throw foodRes.error;
      if (weightRes.error) throw weightRes.error;

      if (!foodRes.data?.length && !weightRes.data?.length) {
        alert("No se encontraron datos para exportar en este rango.");
        setIsExporting(false);
        return;
      }

      if (foodRes.data && foodRes.data.length > 0) {
        const foodCSV = convertToCSV(foodRes.data);
        downloadCSV(foodCSV, `FoodLogs_${activeProfile}_${new Date().toISOString().split('T')[0]}.csv`);
      }

      if (weightRes.data && weightRes.data.length > 0) {
        const weightCSV = convertToCSV(weightRes.data);
        downloadCSV(weightCSV, `WeightLogs_${activeProfile}_${new Date().toISOString().split('T')[0]}.csv`);
      }

    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Hubo un error exportando los datos.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-2 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Exportar Datos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Descarga tus comidas y pesos en formato CSV.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            variant={exportMode === "all" ? "mint" : "outline"}
            className="flex-1"
            onClick={() => setExportMode("all")}
          >
            Histórico Total
          </Button>
          <Button
            variant={exportMode === "range" ? "mint" : "outline"}
            className="flex-1"
            onClick={() => setExportMode("range")}
          >
            Rango Fechas
          </Button>
        </div>

        {exportMode === "range" && (
          <div className="flex gap-4 items-center mt-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button 
          className="w-full mt-2" 
          variant="outline" 
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exportando..." : "Descargar CSV"}
          {!isExporting && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
