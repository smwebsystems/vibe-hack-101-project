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
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.75rem] border border-white/10 bg-surface/80 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-2xl steady-transition hover:opacity-90">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary shadow-glow">
            <span className="font-headline text-lg font-semibold">P</span>
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
                  "group rounded-full px-3 py-2 font-label text-xs uppercase tracking-[0.15em] steady-transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-white/5 hover:text-primary",
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "mt-1 block h-px w-full surface-line opacity-0 steady-transition",
                    active && "opacity-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="rounded-[1rem] bg-surface-container-high px-4 py-2 ghost-border">
          <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Polygon Amoy
          </div>
          <div className="mt-1 font-headline text-sm font-semibold text-primary">
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.5rem] border border-white/10 bg-surface/90 px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
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
      <main className="mx-auto max-w-7xl px-6 pb-28 pt-10 md:pt-12">{children}</main>
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

export function ActionButton({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      className={cn(
        "steady-transition inline-flex cursor-pointer items-center justify-center rounded-soft px-6 py-4 font-headline text-sm font-bold uppercase tracking-[0.14em]",
        tone === "primary"
          ? "bg-proof-gradient text-on-primary shadow-glow hover:brightness-110"
          : "bg-surface-container-high text-primary ghost-border hover:bg-surface-container-highest",
        disabled && "cursor-not-allowed opacity-50 hover:brightness-100",
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
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

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[2rem] bg-surface-container p-6 md:p-8", className)}>
      {children}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="mt-4 font-headline text-4xl font-bold tracking-tight md:text-5xl">
          {title}
        </h1>
        {body ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">
            {body}
          </p>
        ) : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
