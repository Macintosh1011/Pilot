import type { Metadata } from "next";
import { Newsreader, JetBrains_Mono } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

// Newsreader — the editorial serif voice. Loaded as a variable font so the
// optical-size (opsz) axis tracks font-size (large display text gains contrast,
// small text stays readable), with both upright and italic faces.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});

// JetBrains Mono — nav, micro-labels, the wordmark, the discount code.
// Variable weight axis (no fixed weight requested).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "BoothPilot",
  description: "Live booth visitor experience for BoothPilot, on the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
