export type CnpjWsEstado = {
  id?: number;
  nome?: string;
  sigla?: string;
  ibge_id?: number;
};

export type CnpjWsCidade = {
  id?: number;
  nome?: string;
  ibge_id?: number;
  siafi_id?: string;
};

export type CnpjWsAtividade = {
  id?: string;
  secao?: string;
  divisao?: string;
  grupo?: string;
  classe?: string;
  subclasse?: string;
  descricao?: string;
};

export type CnpjWsInscricaoEstadual = {
  inscricao_estadual?: string;
  ativo?: boolean;
  regime?: string;
  atualizado_em?: string;
  estado?: CnpjWsEstado;
};

export type CnpjWsEstabelecimento = {
  cnpj?: string;
  cnpj_raiz?: string;
  cnpj_ordem?: string;
  cnpj_digito_verificador?: string;
  tipo?: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  tipo_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  ddd1?: string | null;
  telefone1?: string | null;
  email?: string | null;
  atividade_principal?: CnpjWsAtividade | null;
  atividades_secundarias?: CnpjWsAtividade[];
  estado?: CnpjWsEstado | null;
  cidade?: CnpjWsCidade | null;
  inscricoes_estaduais?: CnpjWsInscricaoEstadual[];
  atualizado_em?: string;
};

export type CnpjWsSimples = {
  simples?: string | null;
  data_opcao_simples?: string | null;
  data_exclusao_simples?: string | null;
  mei?: string | null;
  data_opcao_mei?: string | null;
  data_exclusao_mei?: string | null;
  atualizado_em?: string;
};

export type CnpjWsPorte = {
  id?: string;
  descricao?: string;
};

export type CnpjWsResponse = {
  cnpj_raiz?: string;
  razao_social?: string;
  capital_social?: string;
  responsavel_federativo?: string;
  criado_em?: string;
  atualizado_em?: string;
  porte?: CnpjWsPorte | string | null;
  natureza_juridica?: { id?: string; descricao?: string } | null;
  estabelecimento?: CnpjWsEstabelecimento | null;
  simples?: CnpjWsSimples | null;
};

export type CnpjWsEndereco = {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  estado: string | null;
};

export type CnpjWsNormalized = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  estado: string | null;
  municipio: string | null;
  inscricao_estadual: string | null;
  inscricao_estadual_auto: boolean;
  endereco: CnpjWsEndereco;
  cnae_principal: string | null;
  porte: string | null;
  tributacao: string | null;
  tributacao_auto: boolean;
  raw: CnpjWsResponse;
};

export class CnpjWsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "CnpjWsError";
  }
}
