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

        <Link href="/fitness" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/fitness" ? (
            <>
              <div className="bg-orange-100 px-4 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-500">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM8.5 8.5C8.5 7.67 9.17 7 10 7s1.5.67 1.5 1.5S10.83 10 10 10 8.5 9.33 8.5 8.5zM14 10c.83 0 1.5-.67 1.5-1.5S14.83 7 14 7s-1.5.67-1.5 1.5S13.17 10 14 10zm-2 4c-2.33 0-4.32 1.45-5.12 3.5h10.24c-.8-2.05-2.79-3.5-5.12-3.5z"/>
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-foreground">Fitness</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM8.5 8.5C8.5 7.67 9.17 7 10 7s1.5.67 1.5 1.5S10.83 10 10 10 8.5 9.33 8.5 8.5zM14 10c.83 0 1.5-.67 1.5-1.5S14.83 7 14 7s-1.5.67-1.5 1.5S13.17 10 14 10zm-2 4c-2.33 0-4.32 1.45-5.12 3.5h10.24c-.8-2.05-2.79-3.5-5.12-3.5z"/>
              </svg>
              <span className="text-[10px] text-muted-foreground">Fitness</span>
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
