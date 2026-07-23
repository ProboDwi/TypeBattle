import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Keylane — Game Mengetik Multiplayer",
    template: "%s · Keylane",
  },
  description:
    "Latihan mengetik, adu kecepatan realtime, dan bangun statistikmu di arena mengetik Indonesia.",
  applicationName: "Keylane",
  openGraph: {
    title: "Keylane — Ngetik cepat. Jangan banyak salah.",
    description:
      "Latihan sendiri atau balapan mengetik realtime bersama teman.",
    type: "website",
    locale: "id_ID",
    siteName: "Keylane",
    images: [
      {
        url: "/og.png",
        width: 1680,
        height: 945,
        alt: "Keylane — Ngetik cepat. Jangan banyak salah.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keylane",
    description: "Ngetik cepat. Jangan banyak salah.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F0E8",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
