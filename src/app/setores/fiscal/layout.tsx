import { FiscalSubnav } from "@/components/layout/FiscalSubnav";

export default function FiscalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <FiscalSubnav />
      {children}
    </div>
  );
}
