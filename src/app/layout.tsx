import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nathan & Lauren — Save the Date",
  description: "February 26, 2027 · Cancún, Mexico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
