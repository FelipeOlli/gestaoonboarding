export type SectorTabId = "precificacao" | "fiscal" | "dp" | "contabil";

export const SECTOR_TABS: { id: SectorTabId; label: string; href: string }[] = [
  { id: "precificacao", label: "Precificação", href: "/setores/precificacao" },
  { id: "fiscal", label: "Fiscal", href: "/setores/fiscal" },
  { id: "dp", label: "DP", href: "/setores/dp" },
  { id: "contabil", label: "Contábil", href: "/setores/contabil" },
];

export function getEnabledSectorTabs(): SectorTabId[] {
  const raw = process.env.ENABLED_SECTOR_TABS ?? "precificacao,fiscal";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SectorTabId =>
      ["precificacao", "fiscal", "dp", "contabil"].includes(item),
    );
}

export function isSectorTabEnabled(id: SectorTabId) {
  return getEnabledSectorTabs().includes(id);
}
