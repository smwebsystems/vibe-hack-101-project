import { flowSteps, metadataStats } from "../components/proofpass-data";
import {
  PageIntro,
  Panel,
  PageShell,
  PrimaryButton,
  SecondaryButton,
} from "../components/proofpass-ui";

export default function HomePage() {
  return (
    <PageShell>
      <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="space-y-8 lg:col-span-7 lg:pr-8">
          <PageIntro
            eyebrow="Privacy-Preserving Verification"
            title={
              <>
                Prove the{" "}
                <span className="bg-proof-gradient bg-clip-text text-transparent">
                  fact
                </span>
                ,<br className="hidden md:block" /> not the person.
              </>
            }
            body="Verify age, eligibility, or credentials without exposing raw identity data. ProofPass is a small, visual demo of privacy-first verification with pass or fail outcomes only."
          />

          <div className="flex flex-col gap-4 sm:flex-row">
            <PrimaryButton href="/identity">Start mock flow</PrimaryButton>
            <SecondaryButton href="/verify">Review proof screen</SecondaryButton>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metadataStats.map((stat) => (
              <Panel key={stat.label} className="rounded-[1.5rem] bg-surface-container-low p-5">
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {stat.label}
                </div>
                <div className="mt-3 font-headline text-xl font-semibold text-on-surface">
                  {stat.value}
                </div>
              </Panel>
            ))}
          </div>
        </div>

        <div className="relative lg:col-span-5 lg:pt-8">
          <div className="absolute -right-10 -top-8 h-48 w-48 rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-tertiary/15 blur-[90px]" />
          <div className="relative overflow-hidden rounded-[2.25rem] bg-surface-container p-8 shadow-2xl">
            <div className="vault-grid absolute inset-0 opacity-40" />
            <div className="relative space-y-6">
              <div className="glass-panel rounded-[1.75rem] p-6 ghost-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Encrypted payload
                    </div>
                    <div className="mt-4 font-headline text-3xl font-bold text-balance">
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
                    className="rounded-[1.5rem] bg-surface-container-low p-5"
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

      <section className="mt-20 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <Panel className="rounded-[2.25rem] bg-surface-container-low md:p-10">
          <div className="font-label text-[10px] uppercase tracking-[0.18em] text-tertiary-fixed">
            Why it lands
          </div>
          <div className="mt-4 font-headline text-3xl font-bold">
            Privacy benefit first. Crypto details second.
          </div>
          <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant md:text-base">
            The product should read like a trust instrument, not a blockchain toy.
            The interface shows what is proven, what stays hidden, and where trust is
            anchored.
          </p>
        </Panel>
        <Panel className="rounded-[2rem] bg-surface-container-low">
          <div className="font-headline text-2xl font-bold">Local encryption</div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Sensitive fields are encrypted before any network step. The device is the
            vault.
          </p>
        </Panel>
        <Panel className="rounded-[2rem] bg-surface-container-low">
          <div className="font-headline text-2xl font-bold">Minimal chain state</div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Contract state is small and legible. The chain proves integrity, not data
            ownership over full records.
          </p>
        </Panel>
      </section>
    </PageShell>
  );
}
