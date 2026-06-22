import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYT Digital Passport",
  description:
    "QR-based digital passport and registration system for the HYT event.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
