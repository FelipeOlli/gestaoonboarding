import { NextResponse } from "next/server";
import { lookupCnpj } from "@/lib/cnpjws/lookup";
import { formatCnpj, validateCnpj } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> },
) {
  const { cnpj } = await params;
  const digits = cnpj.replace(/\D/g, "");

  if (!validateCnpj(digits)) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    const data = await lookupCnpj(digits);
    return NextResponse.json({ ...data, cnpj: formatCnpj(digits) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar CNPJ";
    const status = message.includes("não encontrado") ? 404 : message.includes("429") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
