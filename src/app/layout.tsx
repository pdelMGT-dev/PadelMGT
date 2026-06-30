import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { ClientProviders } from "@/components/ClientProviders";
import PWARegister from "@/components/PWARegister";
import InstallPrompt from "@/components/InstallPrompt";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const SITE_NAME = "PadelMGT";
const SITE_TITLE = "PadelMGT — Crea. Juega. Rankea.";
const SITE_DESCRIPTION =
  "La plataforma para crear y gestionar torneos, ligas y clubes de pádel. Diseñada para Latinoamérica.";

export const metadata: Metadata = {
  metadataBase: new URL("https://padelmgt.com"),
  title: {
    default: SITE_TITLE,
    template: "%s · PadelMGT",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pádel", "padel", "torneos de pádel", "ligas de pádel", "ranking de pádel",
    "americano", "mexicano", "round robin", "world cup", "clubes de pádel", "LATAM",
  ],
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PadelMGT",
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    url: "https://padelmgt.com",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable}`}>
      <body>
        <ClientProviders>
          <Navbar />
          <main>{children}</main>
          <ConditionalFooter />
        </ClientProviders>
        <PWARegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
