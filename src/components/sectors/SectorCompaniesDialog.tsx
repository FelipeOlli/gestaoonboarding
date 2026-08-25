"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SectorCompanySummary } from "@/lib/services/companies";
import { formatCnpj } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectorName: string | null;
};

export function SectorCompaniesDialog({ open, onOpenChange, sectorName }: Props) {
  const [companies, setCompanies] = useState<SectorCompanySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sectorName) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/sectors/companies?setor=${encodeURIComponent(sectorName)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          companies?: SectorCompanySummary[];
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Não foi possível carregar as empresas.");
        }

        setCompanies(payload?.companies ?? []);
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") return;
        setCompanies([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Não foi possível carregar as empresas.",
        );
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [open, sectorName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,40rem)] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresas do setor {sectorName ?? ""}
          </DialogTitle>
          <DialogDescription>
            Empresas que contrataram este setor, com franquia e CNPJ.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresas...
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-rose-400">{error}</p>
          ) : companies.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhuma empresa encontrada para este setor.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Franquia</th>
                  <th className="px-4 py-3">CNPJ</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link
                        href={`/empresas/${company.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {company.razaoSocial}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{company.franchiseName}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCnpj(company.cnpj)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
