"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Calendar, Scale, BarChart3, Calculator, LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/historial", label: "Historial", icon: Calendar },
  { href: "/peso", label: "Peso", icon: Scale },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/calculadora", label: "Calculadora", icon: Calculator },
];

export function BottomNav() {
  const pathname = usePathname();

  // No mostrar en la pantalla de agregar comida
  if (pathname === "/add") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              <div className={`px-4 py-1 rounded-full transition-colors ${active ? "bg-pixel-mint-light" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-pixel-mint" : "text-muted-foreground"}`} strokeWidth={active ? 2.4 : 2} />
              </div>
              <span className={`text-[10px] whitespace-nowrap ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
