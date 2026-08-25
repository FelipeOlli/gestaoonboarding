"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calculator,
  FileText,
  LayoutDashboard,
  List,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Shield,
  Users,
} from "lucide-react";
import { SECTOR_TABS, type SectorTabId } from "@/lib/config/sector-tabs";
import {
  isFiscalPath,
  isFiscalSubmenuActive,
  FISCAL_SUBMENU,
  type FiscalSubmenuId,
} from "@/lib/config/fiscal-nav";
import {
  isPrecificacaoPath,
  isPrecificacaoSubmenuActive,
  PRECIFICACAO_SUBMENU,
  type PrecificacaoSubmenuId,
} from "@/lib/config/precificacao-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "painel-sidebar-collapsed";
const SIDEBAR_WIDTH = "15rem";

const SECTOR_ICONS: Record<SectorTabId, React.ComponentType<{ className?: string }>> = {
  precificacao: BarChart3,
  fiscal: FileText,
  dp: Users,
  contabil: BookOpen,
};

const PRECIFICACAO_ICONS: Record<
  PrecificacaoSubmenuId,
  React.ComponentType<{ className?: string }>
> = {
  empresas: List,
  dashboard: LayoutDashboard,
};

const FISCAL_ICONS: Record<FiscalSubmenuId, React.ComponentType<{ className?: string }>> = {
  empresas: List,
  dashboard: LayoutDashboard,
};

export function AppShell({
  children,
  enabledSectorTabs,
}: {
  children: React.ReactNode;
  enabledSectorTabs: SectorTabId[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin");

  function isSectorTabEnabled(id: SectorTabId) {
    return enabledSectorTabs.includes(id);
  }

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out",
          collapsed ? "-translate-x-full" : "translate-x-0",
        )}
        style={{ width: SIDEBAR_WIDTH }}
        aria-hidden={collapsed}
      >
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Painel
              </p>
              <p className="truncate text-sm font-bold leading-tight text-foreground">Homologação</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Setores
          </p>
          {SECTOR_TABS.map((tab) => {
            const enabled = isSectorTabEnabled(tab.id);
            const active =
              tab.id === "precificacao"
                ? isPrecificacaoPath(pathname)
                : tab.id === "fiscal"
                  ? isFiscalPath(pathname)
                  : pathname.startsWith(tab.href);
            const Icon = SECTOR_ICONS[tab.id];

            if (!enabled) {
              return (
                <span
                  key={tab.id}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground/60"
                  title="Disponível em breve"
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-50" />
                  {tab.label}
                </span>
              );
            }

            if (tab.id === "precificacao") {
              return (
                <div key={tab.id} className="space-y-1">
                  <Link
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </Link>
                  {active && (
                    <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                      {PRECIFICACAO_SUBMENU.map((subitem) => {
                        const subActive = isPrecificacaoSubmenuActive(pathname, subitem.href);
                        const SubIcon = PRECIFICACAO_ICONS[subitem.id];

                        return (
                          <Link
                            key={subitem.id}
                            href={subitem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                              subActive
                                ? "bg-accent text-foreground"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            {subitem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (tab.id === "fiscal") {
              return (
                <div key={tab.id} className="space-y-1">
                  <Link
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </Link>
                  {active && (
                    <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                      {FISCAL_SUBMENU.map((subitem) => {
                        const subActive = isFiscalSubmenuActive(pathname, subitem.href);
                        const SubIcon = FISCAL_ICONS[subitem.id];

                        return (
                          <Link
                            key={subitem.id}
                            href={subitem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                              subActive
                                ? "bg-accent text-foreground"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            {subitem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              Administração
            </Link>
          </Button>
          <Button asChild className="w-full justify-start gap-2">
            <Link href="/empresas/nova">
              <Plus className="h-4 w-4" />
              Nova empresa
            </Link>
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-in-out",
          mounted && !collapsed && "md:ml-[15rem]",
        )}
      >
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/50 px-4 py-4 backdrop-blur-sm md:px-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            title={collapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}
            aria-label={collapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Gestão de Entrada de Empresas</h1>
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
