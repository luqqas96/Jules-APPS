"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useSearchParams } from "next/navigation";

function WithingsContent() {
  const { activeProfile } = useAppContext();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/withings/status?profile=${encodeURIComponent(activeProfile)}`);
        const data = await res.json();
        if (data.connected) {
          setStatus('connected');
        } else {
          setStatus('disconnected');
          if (data.error && !errorMsg) setErrorMsg(data.error);
        }
      } catch (e) {
        setStatus('disconnected');
        setErrorMsg("Error verificando estado");
      }
    };

    checkStatus();
  }, [activeProfile, searchParams, errorMsg]);

  const handleConnect = () => {
    window.location.href = `/api/withings/auth?profile=${encodeURIComponent(activeProfile)}`;
  };

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
            Al conectar tu cuenta de Withings, la aplicación podrá descargar automáticamente tus pasos, calorías quemadas y calidad de sueño desde tu Scanwatch 2.
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
              <Button variant="outline" size="sm" className="h-8 rounded-full border-green-200 hover:bg-green-100 text-green-700">
                Sincronizar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
