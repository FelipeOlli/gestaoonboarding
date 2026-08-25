import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getEnabledSectorTabsFromSettings } from "@/lib/services/settings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Painel de Homologação",
  description: "Painel interno de precificação e onboarding fiscal",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const enabledSectorTabs = await getEnabledSectorTabsFromSettings();

  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <AppShell enabledSectorTabs={enabledSectorTabs}>{children}</AppShell>
      </body>
    </html>
  );
}
