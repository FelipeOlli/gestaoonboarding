import type { CnpjWsInscricaoEstadual } from "@/lib/cnpjws/types";

export type MappedInscricaoEstadual = {
  inscricao_estadual: string | null;
  inscricao_estadual_auto: boolean;
};

export function mapInscricaoEstadual(
  inscricoes: CnpjWsInscricaoEstadual[] | null | undefined,
): MappedInscricaoEstadual {
  if (!inscricoes?.length) {
    return { inscricao_estadual: null, inscricao_estadual_auto: false };
  }

  const active = inscricoes.find(
    (item) => item.ativo === true && Boolean(item.inscricao_estadual?.trim()),
  );

  if (!active?.inscricao_estadual) {
    return { inscricao_estadual: null, inscricao_estadual_auto: false };
  }

  return {
    inscricao_estadual: active.inscricao_estadual.trim(),
    inscricao_estadual_auto: true,
  };
}
