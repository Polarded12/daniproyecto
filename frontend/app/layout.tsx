import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthTech Bladder Monitor",
  description: "Monitoreo y prevencion de riesgo vesical"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
