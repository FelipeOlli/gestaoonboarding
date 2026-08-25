export type AdminSettingFieldType = "text" | "url" | "password" | "textarea";

export type AdminSettingField = {
  key: string;
  label: string;
  description?: string;
  type: AdminSettingFieldType;
  secret: boolean;
  envFallback?: string;
  placeholder?: string;
};

export const ADMIN_SETTING_GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  fields: AdminSettingField[];
}> = [
  {
    id: "n8n",
    title: "n8n — Automações",
    description: "Webhook usado para sincronizar reuniões com calendário.",
    fields: [
      {
        key: "n8n_meeting_webhook_url",
        label: "URL do webhook (reuniões)",
        type: "url",
        secret: false,
        envFallback: "N8N_MEETING_WEBHOOK_URL",
        placeholder: "https://n8n.exemplo.com/webhook/...",
      },
      {
        key: "n8n_webhook_secret",
        label: "Secret do webhook",
        type: "password",
        secret: true,
        envFallback: "N8N_WEBHOOK_SECRET",
      },
    ],
  },
  {
    id: "google",
    title: "Google — Calendar / OAuth",
    description: "Credenciais OAuth do Google. Salve Client ID/Secret e use o botão para conectar a conta.",
    fields: [
      {
        key: "google_oauth_client_id",
        label: "Client ID",
        type: "text",
        secret: false,
        placeholder: "xxxx.apps.googleusercontent.com",
      },
      {
        key: "google_oauth_client_secret",
        label: "Client Secret",
        type: "password",
        secret: true,
      },
      {
        key: "google_oauth_refresh_token",
        label: "Refresh Token",
        description: "Preenchido automaticamente ao conectar a conta Google.",
        type: "password",
        secret: true,
      },
      {
        key: "google_calendar_id",
        label: "Calendar ID",
        description: "Padrão: primary (agenda principal da conta conectada).",
        type: "text",
        secret: false,
        placeholder: "primary",
      },
    ],
  },
  {
    id: "cnpj",
    title: "CNPJ.ws",
    description: "API de consulta de CNPJ na Receita Federal.",
    fields: [
      {
        key: "cnpjws_api_base_url",
        label: "URL base da API",
        type: "url",
        secret: false,
        envFallback: "CNPJWS_API_BASE_URL",
        placeholder: "https://publica.cnpj.ws",
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    description: "Configurações gerais do painel.",
    fields: [
      {
        key: "enabled_sector_tabs",
        label: "Setores habilitados",
        description: "Separados por vírgula: precificacao, fiscal, dp, contabil",
        type: "text",
        secret: false,
        envFallback: "ENABLED_SECTOR_TABS",
        placeholder: "precificacao,fiscal",
      },
      {
        key: "analyst_email_rafael",
        label: "E-mail do analista Rafael (Fiscal)",
        description: "Usado como convidado quando o analista responsável for Rafael.",
        type: "text",
        secret: false,
        placeholder: "rafael@empresa.com",
      },
      {
        key: "analyst_email_sara",
        label: "E-mail da analista Sara (Fiscal)",
        description: "Usado como convidado quando o analista responsável for Sara.",
        type: "text",
        secret: false,
        placeholder: "sara@empresa.com",
      },
    ],
  },
];

export const ALL_ADMIN_SETTING_KEYS = ADMIN_SETTING_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
);

export const SECRET_ADMIN_SETTING_KEYS = new Set(
  ADMIN_SETTING_GROUPS.flatMap((group) =>
    group.fields.filter((field) => field.secret).map((field) => field.key),
  ),
);
