import type { DocumentoStatus, FaturamentoStatus, PrFranqueadoStatus } from "@/lib/constants";
import type { SegmentOption } from "@/components/ui/StatusSegmentBar";

export const DOCUMENTO_STATUS_OPTIONS: SegmentOption<DocumentoStatus>[] = [
  { value: "enviado", label: "Enviado", activeTone: "success" },
  { value: "assinado", label: "Assinado", activeTone: "success" },
];

export const PR_FRANQUEADO_STATUS_OPTIONS: SegmentOption<PrFranqueadoStatus>[] = [
  { value: "em_andamento", label: "Em andamento", activeTone: "success" },
  { value: "concluido", label: "Concluído", activeTone: "success" },
];

export const FATURAMENTO_STATUS_OPTIONS: SegmentOption<FaturamentoStatus>[] = [
  { value: "recebido", label: "Recebido", activeTone: "success" },
  { value: "sem_recebimento", label: "Sem recebimento", activeTone: "danger" },
];

export type SectorContractStatus = "contratado" | "nao_contratado";

export const SECTOR_CONTRACT_STATUS_OPTIONS: SegmentOption<SectorContractStatus>[] = [
  { value: "nao_contratado", label: "Não contratado" },
  { value: "contratado", label: "Contratado", activeTone: "success" },
];
