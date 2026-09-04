import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MO vs Realisasi Delivery — HARIFF DTE | PPIC Dashboard",
  description: "Executive Dashboard Material Order vs Realisasi Delivery - HARIFF DTE PPIC. Elegant, profesional, detail & informatif.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
