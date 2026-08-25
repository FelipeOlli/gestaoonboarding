"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MANUAL_TRIBUTACAO_OPTIONS,
  SISTEMAS_CONTRATADOS,
  TRIBUTACAO_OPTIONS,
} from "@/lib/constants";
import type { CnpjWsNormalized } from "@/lib/cnpjws/types";
import { formatCnpj, maskCompetenciaInput, normalizeCompetencia } from "@/lib/utils";

type Catalogs = {
  franchises: Array<{ id: string; name: string; email?: string | null }>;
  sectors: Array<{ id: string; name: string; slug: string }>;
};

async function loadCatalogs(): Promise<Catalogs> {
  const res = await fetch("/api/catalogs");
  return res.json();
}

export function CompanyForm() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<CnpjWsNormalized | null>(null);

  const [franchiseId, setFranchiseId] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [situacaoCadastral, setSituacaoCadastral] = useState("");
  const [tributacao, setTributacao] = useState("");
  const [tributacaoAuto, setTributacaoAuto] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<Record<string, number>>({});
  const [sistemaContratado, setSistemaContratado] = useState("");
  const [competenciaEntrada, setCompetenciaEntrada] = useState("");
  const [prLink, setPrLink] = useState("");
  const [scheduleMeeting, setScheduleMeeting] = useState(false);
  const [meetingAt, setMeetingAt] = useState("");
  const [franqueadoEmail, setFranqueadoEmail] = useState("");
  const [newFranchiseName, setNewFranchiseName] = useState("");
  const [newFranchiseEmail, setNewFranchiseEmail] = useState("");
  const [addingFranchise, setAddingFranchise] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshCatalogs() {
    try {
      const data = await loadCatalogs();
      setCatalogs(data);
    } catch {
      setError("Não foi possível carregar franquias e setores.");
    }
  }

  useEffect(() => {
    refreshCatalogs();
  }, []);

  useEffect(() => {
    if (!franchiseId) {
      setFranqueadoEmail("");
      return;
    }

    const franchise = catalogs?.franchises.find((item) => item.id === franchiseId);
    if (franchise?.email) {
      setFranqueadoEmail(franchise.email);
      return;
    }

    fetch(`/api/franchises/${franchiseId}/email`)
      .then((res) => res.json())
      .then((data: { email?: string | null }) => {
        if (data.email) setFranqueadoEmail(data.email);
      })
      .catch(() => undefined);
  }, [franchiseId, catalogs?.franchises]);

  const cnpjDigits = useMemo(() => cnpj.replace(/\D/g, ""), [cnpj]);

  useEffect(() => {
    if (cnpjDigits.length !== 14) {
      setLookup(null);
      setCnpjError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCnpjLoading(true);
      setCnpjError(null);
      try {
        const res = await fetch(`/api/cnpj/${cnpjDigits}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro na consulta");

        const normalized = data as CnpjWsNormalized;
        setLookup(normalized);
        setRazaoSocial(normalized.razao_social ?? "");
        setNomeFantasia(normalized.nome_fantasia ?? "");
        setSituacaoCadastral(normalized.situacao_cadastral ?? "");
        setTributacao(normalized.tributacao ?? "");
        setTributacaoAuto(normalized.tributacao_auto);
      } catch (err) {
        setLookup(null);
        setCnpjError(err instanceof Error ? err.message : "Erro na consulta");
      } finally {
        setCnpjLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [cnpjDigits]);

  function toggleSector(sectorId: string) {
    setSelectedSectors((prev) => {
      const next = { ...prev };
      if (next[sectorId] !== undefined) {
        delete next[sectorId];
      } else {
        next[sectorId] = 0;
      }
      return next;
    });
  }

  function setSectorValue(sectorId: string, value: number) {
    setSelectedSectors((prev) => ({ ...prev, [sectorId]: value }));
  }

  async function handleAddFranchise() {
    const name = newFranchiseName.trim();
    if (!name) {
      setError("Informe o nome da nova franquia.");
      return;
    }

    setAddingFranchise(true);
    setError(null);

    try {
      const res = await fetch("/api/franchises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: newFranchiseEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar franquia");

      await refreshCatalogs();
      setFranchiseId(data.id);
      if (data.email) setFranqueadoEmail(data.email);
      setNewFranchiseName("");
      setNewFranchiseEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar franquia");
    } finally {
      setAddingFranchise(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sectorIds = Object.keys(selectedSectors);
    if (!franchiseId || !razaoSocial || cnpjDigits.length !== 14 || sectorIds.length === 0) {
      setError("Preencha franquia, CNPJ, razão social e ao menos um setor.");
      setLoading(false);
      return;
    }

    const competenciaNormalizada = competenciaEntrada
      ? normalizeCompetencia(competenciaEntrada)
      : null;
    if (competenciaEntrada && !competenciaNormalizada) {
      setError("Competência inválida. Use o formato MM-AAAA (ex: 03-2026).");
      setLoading(false);
      return;
    }

    const payload = {
      franchiseId,
      cnpj: cnpjDigits,
      razaoSocial,
      nomeFantasia: nomeFantasia || null,
      situacaoCadastral: situacaoCadastral || null,
      tributacao: tributacao || null,
      competenciaEntrada: competenciaNormalizada,
      prLink: prLink || null,
      sectorIds,
      sectorValues: selectedSectors,
      cnpjwsRaw: lookup ? JSON.stringify(lookup.raw) : null,
      fiscal: lookup
        ? {
            inscricaoEstadual: lookup.inscricao_estadual,
            inscricaoEstadualAuto: lookup.inscricao_estadual_auto,
            estado: lookup.estado,
            municipio: lookup.municipio,
            logradouro: lookup.endereco.logradouro,
            numero: lookup.endereco.numero,
            complemento: lookup.endereco.complemento,
            bairro: lookup.endereco.bairro,
            cep: lookup.endereco.cep,
            sistemaContratado: sistemaContratado || null,
            tributacao: tributacao || null,
          }
        : {
            sistemaContratado: sistemaContratado || null,
            tributacao: tributacao || null,
          },
      meeting: scheduleMeeting && meetingAt
        ? {
            scheduledAt: new Date(meetingAt).toISOString(),
            franqueadoEmail: franqueadoEmail.trim() || null,
          }
        : undefined,
    };

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar");

      router.push(`/empresas/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="franchise">Franquia *</Label>
            <select
              id="franchise"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={franchiseId}
              onChange={(e) => setFranchiseId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {catalogs?.franchises.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {!franchiseId && (
            <div className="space-y-2 md:col-span-2">
              <Label>Cadastrar nova franquia</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-48 flex-1"
                  placeholder="Nome da franquia"
                  value={newFranchiseName}
                  onChange={(e) => setNewFranchiseName(e.target.value)}
                />
                <Input
                  className="min-w-48 flex-1"
                  type="email"
                  placeholder="E-mail do franqueado (opcional)"
                  value={newFranchiseEmail}
                  onChange={(e) => setNewFranchiseEmail(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddFranchise}
                  disabled={addingFranchise}
                >
                  {addingFranchise ? "Salvando..." : "Adicionar franquia"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Franquias cadastradas aqui ficam disponíveis imediatamente nos próximos cadastros.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              required
            />
            {cnpjLoading && <p className="text-xs text-muted-foreground">Consultando CNPJ.WS...</p>}
            {cnpjError && <p className="text-xs text-red-400">{cnpjError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="razao">Razão social *</Label>
            <Input
              id="razao"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fantasia">Nome fantasia</Label>
            <Input
              id="fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="situacao">Situação cadastral</Label>
            <Input
              id="situacao"
              value={situacaoCadastral}
              onChange={(e) => setSituacaoCadastral(e.target.value)}
              readOnly={Boolean(lookup)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tributacao">Tributação</Label>
            {tributacaoAuto ? (
              <div className="flex h-10 items-center gap-2">
                <Input id="tributacao" value={tributacao} readOnly />
                <Badge variant="success">Auto</Badge>
              </div>
            ) : (
              <select
                id="tributacao"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={tributacao}
                onChange={(e) => setTributacao(e.target.value)}
              >
                <option value="">Selecione</option>
                {MANUAL_TRIBUTACAO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                {TRIBUTACAO_OPTIONS.filter((opt) => !MANUAL_TRIBUTACAO_OPTIONS.includes(opt as never)).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setores contratados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalogs?.sectors.map((sector) => {
            const selected = selectedSectors[sector.id] !== undefined;
            return (
              <div key={sector.id} className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSector(sector.id)}
                  />
                  {sector.name}
                </label>
                {selected && (
                  <Input
                    className="h-9 w-32"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Valor"
                    value={selectedSectors[sector.id]}
                    onChange={(e) => setSectorValue(sector.id, Number(e.target.value))}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrato e operação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sistema">Sistema contratado</Label>
            <select
              id="sistema"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={sistemaContratado}
              onChange={(e) => setSistemaContratado(e.target.value)}
            >
              <option value="">Selecione</option>
              {SISTEMAS_CONTRATADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competencia">Competência de entrada (MM-AAAA)</Label>
            <Input
              id="competencia"
              placeholder="03-2026"
              value={competenciaEntrada}
              onChange={(e) => setCompetenciaEntrada(maskCompetenciaInput(e.target.value))}
              maxLength={7}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pr">Link do PR</Label>
            <Input
              id="pr"
              type="url"
              placeholder="https://..."
              value={prLink}
              onChange={(e) => setPrLink(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleMeeting}
                onChange={(e) => setScheduleMeeting(e.target.checked)}
              />
              Agendar reunião agora
            </label>
            {scheduleMeeting && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meetingAt">Data e hora</Label>
                  <Input
                    id="meetingAt"
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(e) => setMeetingAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="franqueadoEmail">E-mail do franqueado</Label>
                  <Input
                    id="franqueadoEmail"
                    type="email"
                    placeholder="franqueado@exemplo.com"
                    value={franqueadoEmail}
                    onChange={(e) => setFranqueadoEmail(e.target.value)}
                  />
                  {franqueadoEmail && (
                    <p className="text-xs text-muted-foreground">
                      Preenchido automaticamente com base em reuniões anteriores desta franquia.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Cadastrar empresa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
