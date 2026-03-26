import type { Metadata } from "next";
import { ProofPassProvider } from "../components/proofpass-flow";
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
      <body>
        <ProofPassProvider>{children}</ProofPassProvider>
      </body>
    </html>
  );
}
