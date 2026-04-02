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
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.35rem] border border-white/10 bg-surface/80 px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl md:rounded-[1.75rem] md:px-6 md:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl steady-transition hover:opacity-90">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary shadow-glow md:h-11 md:w-11 md:rounded-[1rem]">
            <span className="font-headline text-base font-semibold md:text-lg">P</span>
          </div>
          <div className="min-w-0">
            <div className="truncate font-headline text-lg font-bold tracking-tight text-primary md:text-2xl">
              ProofPass
            </div>
            <div className="truncate font-label text-[9px] uppercase tracking-serial text-on-surface-variant md:text-[10px]">
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
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.5rem] border border-white/10 bg-surface/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 items-center justify-center rounded-xl px-2 py-2 text-center font-label text-[10px] uppercase tracking-[0.08em] steady-transition",
                active
                  ? "bg-proof-gradient text-surface shadow-glow"
                  : "text-on-surface-variant",
              )}
            >
              <span className="truncate">{item.label}</span>
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
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 md:px-6 md:pt-12">{children}</main>
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
      className="steady-transition inline-flex w-full items-center justify-center rounded-soft bg-proof-gradient px-6 py-4 text-center font-headline text-sm font-bold uppercase tracking-[0.14em] text-on-primary shadow-glow hover:brightness-110 sm:w-auto"
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
        "steady-transition inline-flex w-full cursor-pointer items-center justify-center rounded-soft px-6 py-4 text-center font-headline text-sm font-bold uppercase tracking-[0.14em] sm:w-auto",
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
      className="steady-transition inline-flex w-full items-center justify-center rounded-soft bg-surface-container-high px-6 py-4 text-center font-headline text-sm font-bold uppercase tracking-[0.14em] text-primary ghost-border hover:bg-surface-container-highest sm:w-auto"
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
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight md:text-5xl">
          {title}
        </h1>
        {body ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant md:text-lg">
            {body}
          </p>
        ) : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
