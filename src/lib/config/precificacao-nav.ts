export const PRECIFICACAO_SUBMENU = [
  {
    id: "empresas",
    label: "Empresas",
    href: "/setores/precificacao",
    description: "Listagem e gestão de empresas em entrada",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/setores/precificacao/dashboard",
    description: "KPIs e gráficos de precificação",
  },
] as const;

export type PrecificacaoSubmenuId = (typeof PRECIFICACAO_SUBMENU)[number]["id"];

export function isPrecificacaoPath(pathname: string) {
  return pathname.startsWith("/setores/precificacao");
}

export function isPrecificacaoSubmenuActive(pathname: string, href: string) {
  if (href === "/setores/precificacao") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname.startsWith(href);
}
