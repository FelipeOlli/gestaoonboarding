import type { FaturamentoStatus } from "@/lib/constants";

type SectorWithFaturamento = {
  faturamentoStatus: string | null;
};

export function getCompanyFaturamentoStatus(
  sectors: SectorWithFaturamento[],
): FaturamentoStatus | null {
  if (sectors.length === 0) return null;

  const statuses = sectors.map(
    (item) => (item.faturamentoStatus as FaturamentoStatus | null) ?? null,
  );
  const first = statuses[0];
  return statuses.every((status) => status === first) ? first : null;
}
