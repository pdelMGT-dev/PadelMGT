import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "PadelMGT — Crea. Juega. Rankea.",
  description: "La plataforma para crear y gestionar torneos, ligas y clubes de pádel. Diseñada para Latinoamérica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ClientProviders>
          <Navbar />
          <main>{children}</main>
          <ConditionalFooter />
        </ClientProviders>
      </body>
    </html>
  );
}
