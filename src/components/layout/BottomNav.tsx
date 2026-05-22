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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-orange-500"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 1.43-1.43z"/></svg>
              </div>
              <span className="text-[10px] font-semibold text-foreground">Fitness</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 1.43-1.43z"/></svg>
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

        <Link href="/withings" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          {pathname === "/withings" ? (
            <>

              <div className="bg-blue-100 px-4 py-1 rounded-full">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-500">
                  <path d="M5.4 7C5.4 7 4.1 11.2 3.6 12.8C3.1 14.4 2.8 15.6 2 18.2H5.4L6.9 13.5C7.3 12.2 7.7 11 7.7 11L9.1 15.5C9.5 16.8 9.9 18.2 9.9 18.2H12.6C12.6 18.2 13 16.8 13.5 15.5L14.8 11.2C14.8 11.2 15.2 12.4 15.6 13.6L17.1 18.2H20.5C20.5 18.2 18.2 11 17.6 9C17 7 17 7 17 7H14.4L12.9 11.8L11.5 16C11.5 16 11.1 14.7 10.7 13.5L9.3 9C9.3 9 8.9 7 8.9 7H5.4Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-foreground">Withings</span>

            </>
          ) : (
            <>

              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-muted-foreground">
                <path d="M5.4 7C5.4 7 4.1 11.2 3.6 12.8C3.1 14.4 2.8 15.6 2 18.2H5.4L6.9 13.5C7.3 12.2 7.7 11 7.7 11L9.1 15.5C9.5 16.8 9.9 18.2 9.9 18.2H12.6C12.6 18.2 13 16.8 13.5 15.5L14.8 11.2C14.8 11.2 15.2 12.4 15.6 13.6L17.1 18.2H20.5C20.5 18.2 18.2 11 17.6 9C17 7 17 7 17 7H14.4L12.9 11.8L11.5 16C11.5 16 11.1 14.7 10.7 13.5L9.3 9C9.3 9 8.9 7 8.9 7H5.4Z" fill="currentColor"/>
              </svg>
              <span className="text-[10px] text-muted-foreground">Withings</span>

            </>
          )}
        </Link>
      </div>
    </div>
  );
}
