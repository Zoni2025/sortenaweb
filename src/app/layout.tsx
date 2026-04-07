import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sortenaweb - Crie Sorteios Profissionais Online",
  description: "Plataforma completa para criar e gerenciar sorteios online. Defina prêmios, gerencie participantes e compartilhe resultados.",
  keywords: ["sorteio", "rifa", "prêmios", "sorteio online", "sortenaweb"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
