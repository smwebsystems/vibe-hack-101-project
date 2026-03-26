 "use client";

import { PageIntro, PageShell, Panel, PrimaryButton } from "../../components/proofpass-ui";
import { useProofPass } from "../../components/proofpass-flow";
import { ActionButton } from "../../components/proofpass-ui";
import { useRouter } from "next/navigation";

export default function GatewayPage() {
  const router = useRouter();
  const { state } = useProofPass();
  const darkCells = new Set([
    0, 1, 2, 4, 6, 7, 10, 12, 13, 14, 16, 18, 20, 22, 23, 24, 26, 27, 28, 30,
    31, 33, 35, 36, 38, 40, 42, 43, 44, 46, 48,
  ]);

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <PageIntro
          eyebrow="Verification Gateway"
          title="Request selective disclosure"
          body="The verifier scans a temporary gateway and requests one fact only. This example asks for over-18 status."
        />

        <div className="relative mt-10">
          <div className="absolute -inset-1 rounded-3xl bg-proof-gradient opacity-20 blur-xl" />
          <div className="relative rounded-[2.25rem] bg-surface-container-high p-8 ghost-border">
            <div className="rounded-3xl bg-white p-5">
              <div className="grid aspect-square grid-cols-7 gap-1">
                {Array.from({ length: 49 }).map((_, index) => {
                  return (
                    <div
                      key={index}
                      className={darkCells.has(index) ? "rounded-[2px] bg-black" : "rounded-[2px] bg-white"}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="font-headline text-xl font-bold">
                {state.credential?.claimLabel ?? "Age over 18"}
              </div>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-on-surface-variant">
                Temporary encrypted channel is active for a verifier to request one
                proof without seeing the underlying identity record.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <div className="rounded-full bg-surface-container-low px-4 py-2 font-label text-[11px] uppercase tracking-[0.18em] text-tertiary-fixed ghost-border">
                {state.credential ? "Expires in 04:59" : "Issue a credential first"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ActionButton
            disabled={!state.credential}
            onClick={() => router.push(state.credential ? "/verify" : "/identity")}
          >
            {state.credential ? "Open verification portal" : "Create credential first"}
          </ActionButton>
        </div>

        <Panel className="mt-6 rounded-[1.75rem] bg-surface-container-low p-5">
          <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Gateway record
          </div>
          {state.credential ? (
            <div className="mt-3 space-y-3 text-sm leading-6 text-on-surface-variant">
              <div className="flex items-center justify-between gap-4">
                <span>CID</span>
                <code className="text-primary">{state.credential.cid}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Issuer signature</span>
                <code className="text-primary">{state.credential.issuerSignature}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Claim hash</span>
                <code className="text-primary">{state.credential.claimHash.slice(0, 18)}...</code>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              This screen becomes meaningful after the credential is issued and anchored.
            </p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
