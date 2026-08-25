import { PrecificacaoSubnav } from "@/components/layout/PrecificacaoSubnav";

export default function PrecificacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PrecificacaoSubnav />
      {children}
    </div>
  );
}
