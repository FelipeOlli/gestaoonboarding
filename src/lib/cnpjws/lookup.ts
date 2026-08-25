import { mapInscricaoEstadual } from "@/lib/cnpjws/map-inscricao-estadual";
import { isTributacaoAuto, mapTributacao } from "@/lib/cnpjws/map-tributacao";
import {
  CnpjWsError,
  type CnpjWsNormalized,
  type CnpjWsResponse,
} from "@/lib/cnpjws/types";
import { getSettingOrEnv } from "@/lib/services/settings";
import { formatCnpj } from "@/lib/utils";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  data: CnpjWsNormalized;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function normalizeCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "").slice(0, 14);
}

function getApiBaseUrl() {
  return "https://publica.cnpj.ws";
}

async function resolveApiBaseUrl() {
  return (
    (await getSettingOrEnv("cnpjws_api_base_url", "CNPJWS_API_BASE_URL")) ??
    getApiBaseUrl()
  ).replace(/\/$/, "");
}

function resolvePorte(porte: CnpjWsResponse["porte"]): string | null {
  if (!porte) return null;
  if (typeof porte === "string") return porte;
  return porte.descricao ?? null;
}

function normalizeResponse(cnpjDigits: string, raw: CnpjWsResponse): CnpjWsNormalized {
  const estabelecimento = raw.estabelecimento;
  const ie = mapInscricaoEstadual(estabelecimento?.inscricoes_estaduais);
  const tributacao = mapTributacao(raw.simples);

  return {
    cnpj: formatCnpj(cnpjDigits),
    razao_social: raw.razao_social ?? null,
    nome_fantasia: estabelecimento?.nome_fantasia ?? null,
    situacao_cadastral: estabelecimento?.situacao_cadastral ?? null,
    estado: estabelecimento?.estado?.sigla ?? null,
    municipio: estabelecimento?.cidade?.nome ?? null,
    inscricao_estadual: ie.inscricao_estadual,
    inscricao_estadual_auto: ie.inscricao_estadual_auto,
    endereco: {
      logradouro: estabelecimento?.logradouro ?? null,
      numero: estabelecimento?.numero ?? null,
      complemento: estabelecimento?.complemento ?? null,
      bairro: estabelecimento?.bairro ?? null,
      cep: estabelecimento?.cep ?? null,
      municipio: estabelecimento?.cidade?.nome ?? null,
      estado: estabelecimento?.estado?.sigla ?? null,
    },
    cnae_principal: estabelecimento?.atividade_principal?.descricao ?? null,
    porte: resolvePorte(raw.porte),
    tributacao,
    tributacao_auto: isTributacaoAuto(raw.simples),
    raw,
  };
}

function getCached(cnpjDigits: string): CnpjWsNormalized | null {
  const entry = cache.get(cnpjDigits);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(cnpjDigits);
    return null;
  }

  return entry.data;
}

function setCached(cnpjDigits: string, data: CnpjWsNormalized) {
  cache.set(cnpjDigits, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCnpjCache(cnpj?: string) {
  if (!cnpj) {
    cache.clear();
    return;
  }

  cache.delete(normalizeCnpj(cnpj));
}

export async function lookupCnpj(cnpj: string): Promise<CnpjWsNormalized> {
  const cnpjDigits = normalizeCnpj(cnpj);

  if (cnpjDigits.length !== 14) {
    throw new CnpjWsError("CNPJ inválido. Informe 14 dígitos.", 400, "invalid_cnpj");
  }

  const cached = getCached(cnpjDigits);
  if (cached) return cached;

  const apiBaseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/cnpj/${cnpjDigits}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new CnpjWsError("CNPJ não encontrado na base da Receita Federal.", 404, "not_found");
  }

  if (response.status === 429) {
    throw new CnpjWsError(
      "Limite de consultas atingido. Aguarde 1 minuto e tente novamente.",
      429,
      "rate_limit",
    );
  }

  if (!response.ok) {
    throw new CnpjWsError(
      "Não foi possível consultar o CNPJ no momento.",
      response.status,
      "upstream_error",
    );
  }

  const raw = (await response.json()) as CnpjWsResponse;
  const normalized = normalizeResponse(cnpjDigits, raw);

  setCached(cnpjDigits, normalized);
  return normalized;
}
