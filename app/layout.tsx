import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stockdraft",
  description: "Fantasy stock trading league",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased`}>
        <nav style={{
          height: 52,
          background: '#0a0d1a',
          borderBottom: '1px solid #14182e',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #00ff88, #00bfff)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#000' }}>$</div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#fff' }}>STOCKDRAFT</span>
            </a>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
            { href: '/dashboard', label: 'HOME' },
{ href: '/dashboard', label: 'HOME' },
{ href: '/draft', label: 'DRAFT' },
{ href: '/waivers', label: 'WAIVERS' },
{ href: '/stocks', label: 'STOCKS' },
              ].map(link => (
                <a key={link.href} href={link.href} style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4a5568', textDecoration: 'none', borderRadius: 4 }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}