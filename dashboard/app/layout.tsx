import type { Metadata } from "next";
import { Newsreader, JetBrains_Mono } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BoothPilot Dashboard",
  description: "Live CRM, agent timeline, and review queue for BoothPilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
