import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Carregando...</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
