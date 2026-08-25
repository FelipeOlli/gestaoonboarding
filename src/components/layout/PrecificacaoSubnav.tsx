"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isPrecificacaoSubmenuActive,
  PRECIFICACAO_SUBMENU,
  type PrecificacaoSubmenuId,
} from "@/lib/config/precificacao-nav";

const SUBMENU_ICONS: Record<PrecificacaoSubmenuId, React.ComponentType<{ className?: string }>> = {
  empresas: List,
  dashboard: LayoutDashboard,
};

export function PrecificacaoSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
      {PRECIFICACAO_SUBMENU.map((item) => {
        const active = isPrecificacaoSubmenuActive(pathname, item.href);
        const Icon = SUBMENU_ICONS[item.id];

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
