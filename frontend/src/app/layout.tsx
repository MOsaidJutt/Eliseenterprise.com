import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import DebugOverlay from "@/components/DebugOverlay";

export const metadata: Metadata = {
  title: "PlainView — Schedule Analytics",
  description: "Primavera P6 Schedule Analytics — PlainView by Elise Enterprise",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlainView",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
  minimumScale: 0.25,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="PlainView" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <PWARegister />
        {children}
        <DebugOverlay />
      </body>
    </html>
  );
}
