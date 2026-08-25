export const SISTEMAS_CONTRATADOS = ["Domínio", "Alterdata"] as const;
export type SistemaContratado = (typeof SISTEMAS_CONTRATADOS)[number];

export const TRIBUTACAO_OPTIONS = [
  "Simples Nacional",
  "Lucro Presumido",
  "Lucro Real",
  "MEI",
] as const;

export type Tributacao = (typeof TRIBUTACAO_OPTIONS)[number];

export const MANUAL_TRIBUTACAO_OPTIONS = ["Lucro Presumido", "Lucro Real"] as const;

export const SECTOR_SLUGS = ["fiscal", "dp", "contabil"] as const;

export const DOCUMENTO_STATUS = ["enviado", "assinado"] as const;
export type DocumentoStatus = (typeof DOCUMENTO_STATUS)[number];

export const PR_FRANQUEADO_STATUS = ["em_andamento", "concluido"] as const;
export type PrFranqueadoStatus = (typeof PR_FRANQUEADO_STATUS)[number];

export const FATURAMENTO_STATUS = ["recebido", "sem_recebimento"] as const;
export type FaturamentoStatus = (typeof FATURAMENTO_STATUS)[number];

export const ANALISTAS_FISCAIS = ["Rafael", "Sara"] as const;
export type AnalistaFiscal = (typeof ANALISTAS_FISCAIS)[number];
