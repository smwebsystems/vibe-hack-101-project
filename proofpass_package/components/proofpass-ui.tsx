"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "./proofpass-data";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-glow">
            <span className="text-lg font-semibold">P</span>
          </div>
          <div>
            <div className="font-headline text-2xl font-bold tracking-tight text-primary">
              ProofPass
            </div>
            <div className="font-label text-[10px] uppercase tracking-serial text-on-surface-variant">
              Sovereign Vault
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navigation.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-label text-xs uppercase tracking-[0.15em] steady-transition",
                  active ? "text-primary" : "text-on-surface-variant hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-full bg-surface-container-high px-4 py-2 ghost-border">
          <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Polygon Amoy
          </div>
          <div className="font-headline text-sm font-semibold text-primary">
            0x71C...492d
          </div>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-surface/90 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3 py-2 font-label text-[11px] uppercase tracking-[0.12em] steady-transition",
                active
                  ? "bg-proof-gradient text-surface shadow-glow"
                  : "text-on-surface-variant",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <TopBar />
      <main className="mx-auto max-w-7xl px-6 pb-28 pt-10">{children}</main>
      <BottomNav />
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-label text-[11px] uppercase tracking-serial text-tertiary-fixed">
      {children}
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="steady-transition inline-flex items-center justify-center rounded-soft bg-proof-gradient px-6 py-4 font-headline text-sm font-bold uppercase tracking-[0.14em] text-on-primary shadow-glow hover:brightness-110"
    >
      {children}
    </Link>
  );
}

export function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="steady-transition inline-flex items-center justify-center rounded-soft bg-surface-container-high px-6 py-4 font-headline text-sm font-bold uppercase tracking-[0.14em] text-primary ghost-border hover:bg-surface-container-highest"
    >
      {children}
    </Link>
  );
}
