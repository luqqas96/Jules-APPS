"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useSearchParams } from "next/navigation";
import { ChartBarIcon, MoonIcon, FireIcon } from "@heroicons/react/24/outline";

function WithingsContent() {
  const { activeProfile } = useAppContext();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [withingsData, setWithingsData] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check for success/error in URL params (from callback redirect)
    if (searchParams) {
      if (searchParams.get("success") === "true") {
         // Successfully connected
      }
      if (searchParams.get("error")) {
         setErrorMsg(searchParams.get("error"));
      }
    }

    const checkStatusAndData = async () => {
      try {
        const res = await fetch(`/api/withings/status?profile=${encodeURIComponent(activeProfile)}`);
        const data = await res.json();
        if (data.connected) {
          setStatus('connected');
          fetchData();
        } else {
          setStatus('disconnected');
          if (data.error && !errorMsg) setErrorMsg(data.error);
        }
      } catch (e) {
        setStatus('disconnected');
        setErrorMsg("Error verificando estado");
      }
    };

    checkStatusAndData();
  }, [activeProfile, searchParams, errorMsg]);

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/withings/data?profile=${encodeURIComponent(activeProfile)}`);
      const data = await res.json();
      if (res.ok) {
        setWithingsData(data);
      } else {
        setErrorMsg(data.error || "Error al sincronizar datos");
      }
    } catch (e) {
      setErrorMsg("Error de red al sincronizar datos");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = () => {
    window.location.href = `/api/withings/auth?profile=${encodeURIComponent(activeProfile)}`;
  };

  // Formatters
  const latestActivity = withingsData?.activity?.length > 0 ? withingsData.activity[withingsData.activity.length - 1] : null;
  const latestSleep = withingsData?.sleep?.length > 0 ? withingsData.sleep[withingsData.sleep.length - 1] : null;
  const latestBody = withingsData?.body;

  return (
    <>
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100">
          Error: {errorMsg}
        </div>
      )}

      <Card className="bg-surface border-none shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Conexión de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Al conectar tu cuenta de Withings, la aplicación descargará automáticamente tus pasos, calorías quemadas y calidad de sueño desde tu Scanwatch 2.
          </p>

          {status === 'loading' && (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pixel-blue"></div>
            </div>
          )}

          {status === 'disconnected' && (
            <Button onClick={handleConnect} className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white">
              Conectar a Withings
            </Button>
          )}

          {status === 'connected' && (
            <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm border border-green-100 flex items-center justify-between">
              <span className="font-semibold">✓ Conectado ({activeProfile})</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isSyncing}
                className="h-8 rounded-full border-green-200 hover:bg-green-100 text-green-700 disabled:opacity-50"
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Visualizations */}
      {status === 'connected' && (
        <div className="space-y-4">
          <Card className="bg-surface border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <FireIcon className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-lg">Actividad (Hoy)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isSyncing ? (
                 <div className="h-16 flex items-center justify-center"><div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded"></div></div>
              ) : latestActivity ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded-xl">
                    <p className="text-xs text-orange-600 font-medium mb-1">Total Calorías</p>
                    <p className="text-xl font-bold text-orange-900">{Math.round(latestActivity.calories + latestActivity.totalcalories)} kcal</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-xs text-blue-600 font-medium mb-1">Pasos</p>
                    <p className="text-xl font-bold text-blue-900">{latestActivity.steps}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos de actividad hoy.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <MoonIcon className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-lg">Sueño (Última noche)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isSyncing ? (
                 <div className="h-16 flex items-center justify-center"><div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded"></div></div>
              ) : latestSleep ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-3 rounded-xl">
                    <p className="text-xs text-indigo-600 font-medium mb-1">Duración</p>
                    <p className="text-xl font-bold text-indigo-900">{Math.floor((latestSleep.data.deepsleepduration + latestSleep.data.lightsleepduration + latestSleep.data.remsleepduration) / 3600)}h {Math.floor(((latestSleep.data.deepsleepduration + latestSleep.data.lightsleepduration + latestSleep.data.remsleepduration) % 3600) / 60)}m</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl">
                    <p className="text-xs text-purple-600 font-medium mb-1">Score</p>
                    <p className="text-xl font-bold text-purple-900">{latestSleep.data.sleep_score || '--'}/100</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos de sueño.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-teal-500" />
                <CardTitle className="text-lg">Composición Corporal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isSyncing ? (
                 <div className="h-16 flex items-center justify-center"><div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded"></div></div>
              ) : latestBody ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-teal-50 p-3 rounded-xl">
                    <p className="text-xs text-teal-600 font-medium mb-1">Grasa (%)</p>
                    <p className="text-xl font-bold text-teal-900">{latestBody.fatRatio ? latestBody.fatRatio.toFixed(1) : '--'}%</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Músculo</p>
                    <p className="text-xl font-bold text-emerald-900">{latestBody.muscleMass ? latestBody.muscleMass.toFixed(1) : '--'} kg</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos recientes de balanza.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function WithingsPage() {
  return (
    <div className="flex-1 p-4 pb-24 max-w-md mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withings</h1>
          <p className="text-sm text-muted-foreground">Scanwatch 2 Data Integration</p>
        </div>
      </div>
      <Suspense fallback={
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pixel-blue"></div>
        </div>
      }>
        <WithingsContent />
      </Suspense>
    </div>
  );
}
