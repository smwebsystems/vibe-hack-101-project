import { flowSteps, metadataStats } from "../components/proofpass-data";
import {
  PageShell,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
} from "../components/proofpass-ui";

export default function HomePage() {
  return (
    <PageShell>
      <section className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="space-y-8 lg:col-span-7">
          <SectionLabel>Privacy-Preserving Verification</SectionLabel>
          <div className="space-y-5">
            <h1 className="max-w-4xl font-headline text-5xl font-bold leading-none tracking-tight md:text-7xl">
              Prove the <span className="bg-proof-gradient bg-clip-text text-transparent">fact</span>,
              <br />
              not the person.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-on-surface-variant md:text-xl">
              Verify age, eligibility, or credentials without exposing raw identity
              data. This is the smallest usable version of private credential
              verification.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <PrimaryButton href="/identity">Start mock flow</PrimaryButton>
            <SecondaryButton href="/verify">See selective disclosure</SecondaryButton>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metadataStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl bg-surface-container-low p-5 ghost-border"
              >
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {stat.label}
                </div>
                <div className="mt-3 font-headline text-xl font-semibold text-on-surface">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:col-span-5">
          <div className="absolute -right-10 -top-8 h-48 w-48 rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-tertiary/15 blur-[90px]" />
          <div className="relative overflow-hidden rounded-[2rem] bg-surface-container p-8 shadow-2xl">
            <div className="vault-grid absolute inset-0 opacity-40" />
            <div className="relative space-y-6">
              <div className="glass-panel rounded-[1.5rem] p-6 ghost-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Encrypted payload
                    </div>
                    <div className="mt-4 font-headline text-3xl font-bold">
                      Age &gt; 18
                    </div>
                  </div>
                  <div className="rounded-full bg-tertiary/10 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                    Verified
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="text-tertiary">Pass</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Hash anchor</span>
                    <span className="font-headline text-primary">0x5f3e...d9e2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage</span>
                    <span>IPFS CID attached</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {flowSteps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-3xl bg-surface-container-low p-5"
                  >
                    <div className="font-headline text-sm font-bold text-primary">
                      {step.id}
                    </div>
                    <div className="mt-3 font-headline text-lg font-semibold">
                      {step.title}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 grid gap-6 rounded-[2rem] bg-surface-container-low p-8 md:grid-cols-3 md:p-12">
        <div>
          <div className="font-headline text-2xl font-bold">Local encryption</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
            Sensitive fields are encrypted before any network step. The device is the
            vault.
          </p>
        </div>
        <div>
          <div className="font-headline text-2xl font-bold">Minimal chain state</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
            The contract stores credential hashes and trusted issuer references. It is
            the trust anchor, not the database.
          </p>
        </div>
        <div>
          <div className="font-headline text-2xl font-bold">Pass or fail only</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
            Verifiers receive the fact they requested, not a dump of the identity
            record behind it.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
