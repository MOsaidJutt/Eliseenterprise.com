import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "PlainView — Schedule Analytics",
  description: "Primavera P6 Schedule Analytics — PlainView by Elise Enterprise",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlainView",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070C18",
  width: "device-width",
  initialScale: 1,
  minimumScale: 0.25,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Theme initialisation — must run before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pv_theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        {/* PWA / iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PlainView" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased" style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}>
        <PWARegister />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
