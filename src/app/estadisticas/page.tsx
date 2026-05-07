"use client";

export default function EstadisticasPage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 border-b border-border/50">
        <h1 className="text-xl font-bold text-foreground">Estadísticas</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-16 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-pixel-lavender-light/50 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">📊</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Próximamente</h2>
        <p className="text-muted-foreground">
          Aquí podrás ver gráficos detallados sobre tu progreso, variaciones de peso y macros consumidos a lo largo del tiempo.
        </p>
      </div>
    </main>
  );
}
