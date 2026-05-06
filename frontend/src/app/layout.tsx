import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Programme Analytics Dashboard",
  description: "Primavera P6 Schedule Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
