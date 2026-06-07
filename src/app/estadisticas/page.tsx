"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, Cell } from 'recharts';
import { useAppContext } from "@/contexts/AppContext";

export default function EstadisticasPage() {
  const [data, setData] = useState<{ weight: any[], macros: any[], advancedStats?: any }>({ weight: [], macros: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { macroGoals, activeProfile } = useAppContext();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats?profile=${activeProfile}`);
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
          setError(json.error || "Error loading statistics");
        }
      } catch (e) {
        setError("Network error loading statistics");
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
            Loading charts...
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
                    <AreaChart data={data.weight} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis 
                        domain={[(min) => Math.floor(min) - 1, (max) => Math.ceil(max) + 1]} 
                        allowDecimals={true} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, 'Weight']}
                        labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} />
                    </AreaChart>
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
                      {data.advancedStats && (
                        <>
                          <ReferenceLine y={data.advancedStats.avgCals} stroke="#8b5cf6" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Avg', fill: '#8b5cf6', fontSize: 10 }} />
                          <ReferenceLine y={data.advancedStats.medianCals} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Median', fill: '#10b981', fontSize: 10 }} />
                        </>
                      )}
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
              <>
                <Card className="bg-surface border-none shadow-sm mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Caloric Statistics Chart</CardTitle>
                    <p className="text-xs text-muted-foreground">Historical spread (Min, Avg, Max)</p>
                  </CardHeader>
                  <CardContent className="h-64 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Min', value: data.advancedStats.minCals, fill: '#60a5fa' },
                          { name: 'Avg', value: data.advancedStats.avgCals, fill: '#8b5cf6' },
                          { name: 'Median', value: data.advancedStats.medianCals, fill: '#10b981' },
                          { name: 'Max', value: data.advancedStats.maxCals, fill: '#f87171' }
                        ]}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [`${Math.round(value)} kcal`, 'Calories']}
                          cursor={{ fill: '#f3f4f6' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {
                            [
                              { name: 'Min', value: data.advancedStats.minCals, fill: '#60a5fa' },
                              { name: 'Avg', value: data.advancedStats.avgCals, fill: '#8b5cf6' },
                              { name: 'Median', value: data.advancedStats.medianCals, fill: '#10b981' },
                              { name: 'Max', value: data.advancedStats.maxCals, fill: '#f87171' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Macro Statistics Chart */}
                <Card className="bg-surface border-none shadow-sm mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Macro Statistics Chart</CardTitle>
                    <p className="text-xs text-muted-foreground">Historical Avg and Median (g)</p>
                  </CardHeader>
                  <CardContent className="h-64 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Protein', Min: data.advancedStats.protein.min, Avg: data.advancedStats.protein.avg, Median: data.advancedStats.protein.median, Max: data.advancedStats.protein.max },
                          { name: 'Carbs', Min: data.advancedStats.carbs.min, Avg: data.advancedStats.carbs.avg, Median: data.advancedStats.carbs.median, Max: data.advancedStats.carbs.max },
                          { name: 'Fats', Min: data.advancedStats.fats.min, Avg: data.advancedStats.fats.avg, Median: data.advancedStats.fats.median, Max: data.advancedStats.fats.max }
                        ]}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any, name: any) => [`${Math.round(value)}g`, name]}
                          cursor={{ fill: '#f3f4f6' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar dataKey="Min" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Median" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Max" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Stats Summary Text */}
                <Card className="bg-surface border-none shadow-sm mt-6">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-pixel-mint-light/50 p-3 rounded-xl">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Std Deviation</p>
                        <p className="text-lg font-bold">±{data.advancedStats.stdDev} <span className="text-xs font-normal">kcal</span></p>
                      </div>
                      <div className="bg-pixel-lavender-light/50 p-3 rounded-xl">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Caloric Range</p>
                        <p className="text-sm font-bold mt-1">{data.advancedStats.minCals} - {data.advancedStats.maxCals} <span className="text-xs font-normal">kcal</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
