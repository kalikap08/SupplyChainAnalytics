import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supply Chain Analytics",
  description: "Executive dashboard for supply chain performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-ink-900">{children}</body>
    </html>
  );
}
