import { issuanceTimeline } from "../../components/proofpass-data";
import { PageIntro, PageShell, Panel, PrimaryButton } from "../../components/proofpass-ui";

export default function IssuedPage() {
  return (
    <PageShell>
      <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-8 lg:col-span-5">
          <PageIntro
            eyebrow="Issuance and Anchoring"
            title="Securing your identity"
            body="The payload is encrypted, pinned, signed, and anchored. The user sees a clear status trail without exposing the underlying record."
          />

          <Panel className="space-y-6 rounded-[2rem] bg-surface-container-low p-6">
            {issuanceTimeline.map((step, index) => (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-6 w-6 rounded-full ${
                      step.state === "done"
                        ? "bg-tertiary shadow-emerald"
                        : step.state === "active"
                          ? "bg-primary shadow-glow"
                          : "bg-surface-container-highest"
                    }`}
                  />
                  {index < issuanceTimeline.length - 1 ? (
                    <div className="mt-2 h-12 w-px bg-surface-container-highest" />
                  ) : null}
                </div>
                <div>
                  <div
                    className={`font-label text-[11px] uppercase tracking-[0.18em] ${
                      step.state === "pending"
                        ? "text-on-surface-variant/60"
                        : step.state === "active"
                          ? "text-primary"
                          : "text-tertiary"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="mt-2 text-sm text-on-surface-variant">
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-[2.25rem] bg-surface-container p-8 md:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-tertiary/10 blur-[90px]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-tertiary/10 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                    Verified credential
                  </div>
                  <div className="mt-6 font-headline text-5xl font-extrabold tracking-tight">
                    Age: 18+
                  </div>
                </div>
                <div className="rounded-full bg-tertiary/10 px-4 py-2 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                  Anchored
                </div>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Issuer
                  </div>
                  <div className="mt-2 font-headline text-lg font-semibold">
                    Trusted Mock Authority
                  </div>
                </div>
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Issued date
                  </div>
                  <div className="mt-2 font-headline text-lg font-semibold">
                    March 25, 2026
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    IPFS content identifier
                  </div>
                  <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3 font-mono text-sm text-primary">
                    QmXoyp...MshC7W8XhM7Y3ZpL
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Amoy transaction hash
                  </div>
                  <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3 font-mono text-sm text-on-surface">
                    0x5f3e...b4a1c7d9e2f0
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <PrimaryButton href="/">View my credentials</PrimaryButton>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-surface-variant/40 p-4 ghost-border">
            <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              Data sovereignty guaranteed
            </div>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              The proof was anchored from a locally encrypted payload. The demo never
              stores raw PII on a server.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
