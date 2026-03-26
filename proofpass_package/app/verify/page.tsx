"use client";

import { supportedClaimLabel, verifierAppName } from "../../components/proofpass-data";
import {
  ActionButton,
  PageIntro,
  Panel,
  PageShell,
  SecondaryButton,
} from "../../components/proofpass-ui";
import { useProofPass } from "../../components/proofpass-flow";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const { createProof, isBusy, state } = useProofPass();
  const identity = state.identity;
  const credential = state.credential;
  const proof = state.proof;

  return (
    <PageShell>
      <PageIntro
        eyebrow="Selective Disclosure Reveal"
        title="Verification portal"
        body="One field is revealed because the verifier asked for one fact. The rest of the record stays hidden."
        aside={
          <div className="rounded-2xl bg-surface-container px-4 py-3">
            <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              Requesting dapp
            </div>
            <div className="mt-1 font-headline text-lg font-semibold">
              {proof?.verifierApp ?? verifierAppName}
            </div>
          </div>
        }
      />

      <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          <Panel className="rounded-[2.25rem]">
            <div className="font-headline text-xl font-bold">Institutional data disclosure</div>
            <div className="mt-6 space-y-4">
              {[
                { label: "Full Name", value: identity?.fullName ?? "No credential loaded", hidden: true },
                { label: "Date of Birth", value: identity?.dateOfBirth ?? "-", hidden: true },
                { label: "Verification Claim", value: proof?.resultLabel ?? credential?.claimLabel ?? supportedClaimLabel, hidden: false },
                { label: "Passport Number", value: identity?.documentId ?? "-", hidden: true },
              ].map((field) => (
                <div
                  key={field.label}
                  className={`flex items-center justify-between rounded-2xl p-5 ${
                    field.hidden
                      ? "bg-surface-container-low"
                      : "bg-surface-container-highest shadow-emerald"
                  }`}
                >
                  <div>
                    <div
                      className={`font-label text-[10px] uppercase tracking-[0.18em] ${
                        field.hidden ? "text-on-surface-variant" : "text-tertiary"
                      }`}
                    >
                      {field.label}
                    </div>
                    <div
                      className={`mt-2 font-headline text-lg font-semibold ${
                        field.hidden ? "redacted text-transparent" : "text-on-surface"
                      }`}
                    >
                      {field.value}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] ${
                      field.hidden
                        ? "bg-danger/10 text-danger"
                        : "bg-tertiary/10 text-tertiary"
                    }`}
                  >
                    {field.hidden ? "Hidden" : "True"}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="rounded-[1.5rem] bg-surface-container-low p-5">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Match type
              </div>
              <div className="mt-2 font-headline text-lg font-semibold">
                {proof?.verified ? "On-chain match found" : credential ? "Ready to verify" : "Credential missing"}
              </div>
            </Panel>
            <Panel className="rounded-[1.5rem] bg-surface-container-low p-5">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Authority
              </div>
              <div className="mt-2 font-headline text-lg font-semibold">
                {credential ? "Issuer trusted" : "Issue a credential first"}
              </div>
            </Panel>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="glass-panel rounded-[2.25rem] p-8 ghost-border">
            <h2 className="font-headline text-3xl font-bold tracking-tight">
              Finalize proof
            </h2>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Sign a request confirming age to the verifier. No personal fields are
              shared in the result.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <ActionButton
                disabled={!credential || isBusy}
                onClick={async () => {
                  if (!credential) {
                    router.push("/identity");
                    return;
                  }
                  await createProof();
                }}
              >
                {!credential
                  ? "Create credential first"
                  : isBusy
                    ? "Signing proof..."
                    : proof
                      ? "Proof signed"
                      : "Sign to verify"}
              </ActionButton>
              <SecondaryButton href="/">Return to dapp</SecondaryButton>
            </div>

            {proof ? (
              <div
                className={`mt-8 rounded-2xl px-4 py-4 ${
                  proof.verified ? "bg-tertiary/10 text-tertiary" : "bg-danger/10 text-danger"
                }`}
              >
                <div className="font-label text-[10px] uppercase tracking-[0.18em]">
                  Verification result
                </div>
                <div className="mt-2 font-headline text-xl font-bold">
                  {proof.verified ? "Pass: over 18 verified" : "Fail: claim could not be proven"}
                </div>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl bg-surface-container-lowest p-4">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Request digest
              </div>
              <code className="mt-3 block break-all text-xs text-primary">
                {proof
                  ? `${proof.requestDigest} | NONCE: ${proof.requestNonce}`
                  : credential
                    ? `0x${credential.claimHash.slice(0, 12)}... | CLAIM: AGE_OVER_18`
                    : "Issue a credential to generate a proof request."}
              </code>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
