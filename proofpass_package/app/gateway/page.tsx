import { PageShell, PrimaryButton, SectionLabel } from "../../components/proofpass-ui";

export default function GatewayPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <SectionLabel>Verification Gateway</SectionLabel>
        <div className="mt-4 font-headline text-4xl font-bold tracking-tight">
          Request selective disclosure
        </div>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">
          The verifier scans a temporary gateway and requests one fact only. This
          example asks for over-18 status.
        </p>

        <div className="relative mt-10">
          <div className="absolute -inset-1 rounded-3xl bg-proof-gradient opacity-20 blur-xl" />
          <div className="relative rounded-[2rem] bg-surface-container-high p-8 ghost-border">
            <div className="rounded-3xl bg-white p-5">
              <div className="grid aspect-square grid-cols-7 gap-1">
                {Array.from({ length: 49 }).map((_, index) => {
                  const darkCells = new Set([
                    0, 1, 2, 4, 6, 7, 10, 12, 13, 14, 16, 18, 20, 22, 23, 24, 26, 27,
                    28, 30, 31, 33, 35, 36, 38, 40, 42, 43, 44, 46, 48,
                  ]);
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
              <div className="font-headline text-xl font-bold">Over 18 status</div>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-on-surface-variant">
                Temporary encrypted channel is active for a verifier to request one
                proof without seeing the underlying identity record.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <div className="rounded-full bg-surface-container-low px-4 py-2 font-label text-[11px] uppercase tracking-[0.18em] text-tertiary-fixed ghost-border">
                Expires in 04:59
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <PrimaryButton href="/verify">Open verification portal</PrimaryButton>
        </div>
      </div>
    </PageShell>
  );
}
