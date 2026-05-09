"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useAppContext } from "@/contexts/AppContext";

export default function EstadisticasPage() {
  const [data, setData] = useState<{ weight: any[], macros: any[], advancedStats?: any }>({ weight: [], macros: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { macroGoals } = useAppContext();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const json = await res.json();
        if (res.ok) {
          // Tomamos los ultimos 14 dias para que no se sature en movil
          const recentWeight = json.weight.slice(-14);
          const recentMacros = json.macros.slice(-14);

          // Formatear fechas
          const formatData = (arr: any[]) => arr.map(item => ({
            ...item,
            shortDate: new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
          }));

          setData({
            weight: formatData(recentWeight),
            macros: formatData(recentMacros),
            advancedStats: json.advancedStats
          });
        } else {
          setError(json.error || "Error al cargar estadísticas");
        }
      } catch (e) {
        setError("Error de red al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Statistics</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-4 space-y-6">

        {loading && (
          <div className="text-center text-muted-foreground animate-pulse mt-10">
            Loading gráficos...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Gráfico de Weight */}
            <Card className="bg-surface border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Weight Trend</CardTitle>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                {data.weight.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.weight} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${value} kg`, 'Weight']}
                        labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#93c5fd" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No weight data</div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Calorías */}
            <Card className="bg-surface border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Calories Consumed</CardTitle>
                <p className="text-xs text-muted-foreground">Goal: {macroGoals.calories} kcal</p>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                {data.macros.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.macros} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${Math.round(value)} kcal`, 'Calories']}
                        cursor={{ fill: '#f3f4f6' }}
                      />
                      <Bar dataKey="calories" fill="#fdba74" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No meal data</div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Macros Apilados */}
            <Card className="bg-surface border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Macro Distribution (g)</CardTitle>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                {data.macros.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.macros} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: any) => {
                          const labels: Record<string, string> = { protein: 'Protein', carbs: 'Carbs', fats: 'Fats' };
                          return [`${Math.round(value)}g`, labels[name] || name];
                        }}
                        cursor={{ fill: '#f3f4f6' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="protein" name="Protein" stackId="a" fill="#fca5a5" />
                      <Bar dataKey="carbs" name="Carbs" stackId="a" fill="#93c5fd" />
                      <Bar dataKey="fats" name="Fats" stackId="a" fill="#d8b4fe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No macro data</div>
                )}
              </CardContent>
            </Card>


            {/* Advanced Stats */}
            {data.advancedStats && (
              <Card className="bg-surface border-none shadow-sm mt-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Caloric Statistics</CardTitle>
                  <p className="text-xs text-muted-foreground">Historical averages</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pixel-mint-light/50 p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Average</p>
                      <p className="text-lg font-bold">{data.advancedStats.avgCals} <span className="text-xs font-normal">kcal</span></p>
                    </div>
                    <div className="bg-pixel-peach-light/50 p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Median</p>
                      <p className="text-lg font-bold">{data.advancedStats.medianCals} <span className="text-xs font-normal">kcal</span></p>
                    </div>
                    <div className="bg-pixel-blue-light/50 p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Std Dev</p>
                      <p className="text-lg font-bold">±{data.advancedStats.stdDev} <span className="text-xs font-normal">kcal</span></p>
                    </div>
                    <div className="bg-pixel-lavender-light/50 p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Range</p>
                      <p className="text-sm font-bold mt-1">{data.advancedStats.minCals} - {data.advancedStats.maxCals} <span className="text-xs font-normal">kcal</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
