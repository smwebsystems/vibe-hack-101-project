import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPass",
  description: "Verify the fact, not the data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
