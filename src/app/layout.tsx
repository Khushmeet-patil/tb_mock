import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NTEP Sample Tracking System",
  description: "Real-time monitoring and verification of TB diagnostic sample journey under the National Tuberculosis Elimination Programme.",
  icons: {
    icon: "/images/logo-ntep.jpg",
  },
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="body-container">
        <Header />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
