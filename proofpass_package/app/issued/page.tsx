"use client";

import { PageIntro, PageShell, Panel, ActionButton } from "../../components/proofpass-ui";
import { useProofPass } from "../../components/proofpass-flow";
import { useRouter } from "next/navigation";

export default function IssuedPage() {
  const router = useRouter();
  const { state } = useProofPass();
  const credential = state.credential;

  const timeline = [
    { label: "Encrypting Payload", detail: credential ? "AES-GCM local encryption complete." : "Waiting for identity input.", state: credential ? "done" : "pending" },
    { label: "Uploading to IPFS", detail: credential ? `CID prepared: ${credential.cid}` : "No encrypted payload yet.", state: credential ? "done" : "pending" },
    { label: "Requesting Issuer Signature", detail: credential ? `Issuer signature: ${credential.issuerSignature}` : "Issuer step not started.", state: credential ? "done" : "pending" },
    { label: "Anchoring on Polygon Amoy", detail: credential ? `Credential anchor: ${credential.txHash}` : "On-chain anchor not available.", state: credential ? "done" : "pending" },
  ] as const;

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
            {timeline.map((step, index) => (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-6 w-6 rounded-full ${
                      step.state === "done"
                        ? "bg-tertiary shadow-emerald"
                        : "bg-surface-container-highest"
                    }`}
                  />
                  {index < timeline.length - 1 ? (
                    <div className="mt-2 h-12 w-px bg-surface-container-highest" />
                  ) : null}
                </div>
                <div>
                  <div
                    className={`font-label text-[11px] uppercase tracking-[0.18em] ${
                      step.state === "pending"
                        ? "text-on-surface-variant/60"
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
                    {credential ? "Issued credential" : "Credential pending"}
                  </div>
                  <div className="mt-6 font-headline text-5xl font-extrabold tracking-tight">
                    {credential ? credential.claimLabel : "No credential yet"}
                  </div>
                </div>
                <div className="rounded-full bg-tertiary/10 px-4 py-2 font-label text-[10px] uppercase tracking-[0.18em] text-tertiary">
                  {credential ? "Anchored" : "Pending"}
                </div>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Issuer
                  </div>
                  <div className="mt-2 font-headline text-lg font-semibold">
                    {credential?.issuer ?? "Trusted Mock Authority"}
                  </div>
                </div>
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Issued date
                  </div>
                  <div className="mt-2 font-headline text-lg font-semibold">
                    {credential
                      ? new Date(credential.issuedAt).toLocaleDateString("en-ZA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not issued"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    IPFS content identifier
                  </div>
                  <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3 font-mono text-sm text-primary">
                    {credential?.cid ?? "No CID generated"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Amoy transaction hash
                  </div>
                  <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3 font-mono text-sm text-on-surface">
                    {credential?.txHash ?? "No transaction hash"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Payload hash
                  </div>
                  <div className="mt-2 rounded-2xl bg-surface-container-low px-4 py-3 font-mono text-sm text-primary">
                    {credential?.payloadHash ?? "No payload hash"}
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <ActionButton
                  disabled={!credential}
                  onClick={() => router.push(credential ? "/gateway" : "/identity")}
                >
                  {credential ? "Open verification gateway" : "Create credential"}
                </ActionButton>
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
