"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function WithingsPage() {
  return (
    <div className="flex-1 p-4 pb-24 max-w-md mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withings</h1>
          <p className="text-sm text-muted-foreground">Scanwatch 2 Data Integration</p>
        </div>
      </div>

      <Card className="bg-surface border-none shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Configuración API</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            En esta sección pronto podrás vincular tu cuenta de Withings para sincronizar calorías, pasos, sueño y masa muscular automáticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
