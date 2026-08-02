import "./globals.css";
import type { Metadata } from "next";
import { cormorant, jost } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Nathan & Lauren — Save the Date",
  description: "February 26, 2027 · Dreams Sapphire Resort & Spa · Riviera Cancún",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Bitwarden) inject
    // attributes on <html> that trigger false-positive hydration warnings.
    <html lang="en" suppressHydrationWarning className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
