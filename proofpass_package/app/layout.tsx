import type { Metadata } from "next";
import { Suspense } from "react";
import { ProofPassProvider } from "../components/proofpass-flow";
import { ThemePreviewController } from "../components/theme-preview";
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
        <Suspense fallback={null}>
          <ThemePreviewController />
        </Suspense>
        <ProofPassProvider>{children}</ProofPassProvider>
      </body>
    </html>
  );
}
