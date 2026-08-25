export const FISCAL_SUBMENU = [
  {
    id: "empresas",
    label: "Empresas",
    href: "/setores/fiscal",
    description: "Listagem fiscal e analista responsável",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/setores/fiscal/dashboard",
    description: "KPIs e indicadores do setor fiscal",
  },
] as const;

export type FiscalSubmenuId = (typeof FISCAL_SUBMENU)[number]["id"];

export function isFiscalPath(pathname: string) {
  return pathname.startsWith("/setores/fiscal");
}

export function isFiscalSubmenuActive(pathname: string, href: string) {
  if (href === "/setores/fiscal") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname.startsWith(href);
}
