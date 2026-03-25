import { PageIntro, PageShell, Panel, PrimaryButton } from "../../components/proofpass-ui";

const fieldClassName =
  "w-full rounded-2xl bg-surface-container-lowest px-5 py-4 text-base text-on-surface outline-none ring-1 ring-transparent steady-transition placeholder:text-outline focus:ring-primary/30";

export default function IdentityPage() {
  return (
    <PageShell>
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5 lg:pr-8">
          <PageIntro
            eyebrow="Step 1 / 3"
            title={
              <>
                Secure your{" "}
                <span className="bg-proof-gradient bg-clip-text text-transparent">
                  sovereign vault
                </span>
              </>
            }
            body="Enter mock KYC data locally. This is demo input, but the rule is real: raw PII should never leave the device."
          />

          <Panel className="rounded-[1.75rem] bg-surface-container-low p-6">
            <div className="font-headline text-lg font-bold text-tertiary-fixed">
              Local-only processing
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              The frontend encrypts this payload client-side before it becomes an IPFS
              object and on-chain credential hash.
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <div className="glass-panel rounded-[2.25rem] p-8 ghost-border md:p-10">
            <div className="mb-10 flex gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-primary" />
              <div className="h-1.5 flex-1 rounded-full bg-surface-container-highest" />
              <div className="h-1.5 flex-1 rounded-full bg-surface-container-highest" />
            </div>

            <form className="space-y-6">
              <div>
                <label className="ml-1 font-label text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Full Name
                </label>
                <input className={fieldClassName} placeholder="Institutional Name as per ID" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="ml-1 font-label text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Date of Birth
                  </label>
                  <input className={fieldClassName} type="date" />
                </div>
                <div>
                  <label className="ml-1 font-label text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Passport / ID Number
                  </label>
                  <input className={fieldClassName} placeholder="AB1234567" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-surface-container-highest/50 p-4">
                <div>
                  <div className="font-label text-[11px] uppercase tracking-[0.18em] text-tertiary-fixed">
                    Vault encryption active
                  </div>
                  <div className="mt-1 text-sm text-on-surface-variant">
                    AES encryption occurs before storage or signing.
                  </div>
                </div>
                <div className="font-headline text-sm font-semibold text-primary">
                  AES-256
                </div>
              </div>

              <PrimaryButton href="/gateway">Encrypt and anchor</PrimaryButton>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
