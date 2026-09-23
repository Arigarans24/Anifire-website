import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import PlayerRoot from "@/components/player/PlayerRoot";

const display = Montserrat({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anifire — Аниме стриминг",
  description:
    "Смотри лучшие аниме сериалы онлайн. Новинки каждый день, огромная библиотека жанров и персональные рекомендации.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <PlayerProvider>
            {children}
            <PlayerRoot />
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
