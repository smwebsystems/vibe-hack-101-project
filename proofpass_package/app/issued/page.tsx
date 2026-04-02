"use client";

import { useRouter } from "next/navigation";
import {
  ActionButton,
  PageIntro,
  PageShell,
  Panel,
  SecondaryButton,
} from "../../components/proofpass-ui";

const lifecycle = [
  {
    label: "Claimed identity",
    detail:
      "The user enters a claimed name and date of birth, connects a wallet, and uploads an ID or passport image.",
  },
  {
    label: "OCR and review",
    detail:
      "The OCR verifier extracts the needed fields, checks the claimed details, and prepares an age attestation.",
  },
  {
    label: "Verifier signature",
    detail:
      "A trusted verifier signs the public age claim that will be anchored to the subject wallet.",
  },
  {
    label: "On-chain record",
    detail:
      "The contract stores the attestation state and validity window so verifiers can read the result later.",
  },
] as const;

const storedFields = [
  {
    label: "subject",
    value: "Wallet that owns the age credential",
  },
  {
    label: "isOver18",
    value: "The age claim being proven",
  },
  {
    label: "quality",
    value: "Verifier confidence score for the extraction",
  },
  {
    label: "commitment",
    value: "Hash-derived commitment to the verified KYC data",
  },
  {
    label: "issuedAt",
    value: "When the verifier signed the attestation",
  },
  {
    label: "expiresAt",
    value: "When the attestation stops being valid",
  },
  {
    label: "nonce",
    value: "Replay protection for the attestation record",
  },
] as const;

export default function IssuedPage() {
  const router = useRouter();

  return (
    <PageShell>
      <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-8 lg:col-span-5">
          <PageIntro
            eyebrow="Attestation Lifecycle"
            title="What gets signed and stored"
            body="ProofPass does not put the document on-chain. The document is reviewed off-chain, then the verifier-backed age attestation is stored in the registry."
          />

          <Panel className="space-y-6 rounded-[2rem] bg-surface-container-low p-6">
            {lifecycle.map((step, index) => (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-6 w-6 rounded-full bg-tertiary shadow-emerald" />
                  {index < lifecycle.length - 1 ? (
                    <div className="mt-2 h-12 w-px bg-surface-container-highest" />
                  ) : null}
                </div>
                <div>
                  <div className="font-label text-[11px] uppercase tracking-[0.18em] text-tertiary">
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

        <div className="space-y-6 lg:col-span-7">
          <div className="relative overflow-hidden rounded-[2.25rem] bg-surface-container p-8 md:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-tertiary/10 blur-[90px]" />
            <div className="relative">
              <div className="inline-flex rounded-full bg-tertiary/10 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                Contract-facing object
              </div>
              <div className="mt-6 font-headline text-5xl font-extrabold tracking-tight">
                Age attestation
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-on-surface-variant">
                The registry stores a verifier-backed record that lets later verifiers
                check the age result, signer, and validity window without accessing the
                source document.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {storedFields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-[1.5rem] bg-surface-container-low p-5"
                  >
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      {field.label}
                    </div>
                    <div className="mt-3 text-sm leading-6 text-on-surface">
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4 md:flex-row">
                <ActionButton onClick={() => router.push("/identity")}>
                  Issue an age credential
                </ActionButton>
                <SecondaryButton href="/verify">Verify a wallet</SecondaryButton>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-surface-variant/40 p-4 ghost-border">
            <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              Privacy boundary
            </div>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              The OCR verifier handles the uploaded document off-chain. The registry
              keeps only the age attestation state needed for later verification.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
