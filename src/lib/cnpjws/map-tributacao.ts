import type { Tributacao } from "@/lib/constants";
import type { CnpjWsSimples } from "@/lib/cnpjws/types";

function isOptante(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "sim";
}

function hasActiveExclusion(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function mapTributacao(simples: CnpjWsSimples | null | undefined): Tributacao | null {
  if (!simples) return null;

  if (isOptante(simples.mei) && !hasActiveExclusion(simples.data_exclusao_mei)) {
    return "MEI";
  }

  if (isOptante(simples.simples) && !hasActiveExclusion(simples.data_exclusao_simples)) {
    return "Simples Nacional";
  }

  return null;
}

export function isTributacaoAuto(simples: CnpjWsSimples | null | undefined): boolean {
  return mapTributacao(simples) !== null;
}
