"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ScaleIcon, ChartBarIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { HomeIcon as HomeIconSolid, ScaleIcon as ScaleIconSolid, ChartBarIcon as ChartBarIconSolid, CalendarIcon as CalendarIconSolid } from "@heroicons/react/24/solid";

export function BottomNav() {
  const pathname = usePathname();

  // No mostrar en la pantalla de agregar comida
  if (pathname === "/add") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-surface-secondary pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        <Link href="/" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/" ? (
            <>
              <div className="bg-pixel-mint-light/50 px-4 py-1 rounded-full">
                <HomeIconSolid className="w-6 h-6 text-pixel-mint" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">Home</span>
            </>
          ) : (
            <>
              <HomeIcon className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Home</span>
            </>
          )}
        </Link>


        <Link href="/historial" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/historial" ? (
            <>
              <div className="bg-pixel-peach-light/50 px-4 py-1 rounded-full">
                <CalendarIconSolid className="w-6 h-6 text-pixel-peach" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">History</span>
            </>
          ) : (
            <>
              <CalendarIcon className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">History</span>
            </>
          )}
        </Link>

        <Link href="/peso" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/peso" ? (
            <>
              <div className="bg-pixel-blue-light/50 px-4 py-1 rounded-full">
                <ScaleIconSolid className="w-6 h-6 text-pixel-blue" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">Daily Weight</span>
            </>
          ) : (
            <>
              <ScaleIcon className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Daily Weight</span>
            </>
          )}
        </Link>

        <Link href="/estadisticas" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/estadisticas" ? (
            <>
              <div className="bg-pixel-lavender-light/50 px-4 py-1 rounded-full">
                <ChartBarIconSolid className="w-6 h-6 text-pixel-lavender" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">Statistics</span>
            </>
          ) : (
            <>
              <ChartBarIcon className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Statistics</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
