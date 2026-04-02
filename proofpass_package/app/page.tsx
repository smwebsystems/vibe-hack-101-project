 "use client";

import { flowSteps, metadataStats } from "../components/proofpass-data";
import {
  ActionButton,
  PageIntro,
  Panel,
  PageShell,
  SecondaryButton,
} from "../components/proofpass-ui";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <PageShell>
      <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="space-y-8 lg:col-span-7 lg:pr-8">
          <PageIntro
            eyebrow="Verifier-Backed Age Credentials"
            title={
              <>
                Prove the{" "}
                <span className="bg-proof-gradient bg-clip-text text-transparent">
                  fact
                </span>
                ,<br className="hidden md:block" /> not the person.
              </>
            }
            body="Upload an ID or passport, extract the holder details through the OCR verifier, then store only a signed age attestation on-chain. Verifiers later check the wallet without seeing the source document."
          />

          <div className="flex flex-col gap-4 sm:flex-row">
            <ActionButton onClick={() => router.push("/identity")}>
              Start age verification
            </ActionButton>
            <SecondaryButton href="/verify">Check a wallet</SecondaryButton>
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
                      Verifier-backed attestation
                    </div>
                    <div className="mt-4 font-headline text-3xl font-bold text-balance">
                      Age over 18
                    </div>
                  </div>
                  <div className="rounded-full bg-tertiary/10 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                    Ready
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Document handling</span>
                    <span className="text-tertiary">OCR review off-chain</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Chain record</span>
                    <span className="font-headline text-primary">Subject + age claim</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verifier view</span>
                    <span>Age result, signer, expiry</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {flowSteps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-[1.5rem] bg-surface-container-low p-5 lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:items-start lg:gap-5"
                  >
                    <div className="font-headline text-sm font-bold text-primary lg:pt-1">
                      {step.id}
                    </div>
                    <div>
                      <div className="mt-3 text-pretty font-headline text-lg font-semibold leading-tight lg:mt-0 lg:text-[1.35rem]">
                        {step.title}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-on-surface-variant lg:max-w-[44ch]">
                        {step.body}
                      </p>
                    </div>
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
          <div className="font-headline text-2xl font-bold">Off-chain document review</div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            The uploaded image is sent to the OCR verifier for extraction and match
            checks before any on-chain write happens.
          </p>
        </Panel>
        <Panel className="rounded-[2rem] bg-surface-container-low">
          <div className="font-headline text-2xl font-bold">Minimal chain state</div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            The contract stores the age attestation and verification metadata, not the
            source document or full identity record.
          </p>
        </Panel>
      </section>
    </PageShell>
  );
}
