import { proofFields } from "../../components/proofpass-data";
import {
  PageIntro,
  Panel,
  PageShell,
  PrimaryButton,
  SecondaryButton,
} from "../../components/proofpass-ui";

export default function VerifyPage() {
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
              The Wine Cellar
            </div>
          </div>
        }
      />

      <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          <Panel className="rounded-[2.25rem]">
            <div className="font-headline text-xl font-bold">Institutional data disclosure</div>
            <div className="mt-6 space-y-4">
              {proofFields.map((field) => (
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
                On-chain match found
              </div>
            </Panel>
            <Panel className="rounded-[1.5rem] bg-surface-container-low p-5">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Authority
              </div>
              <div className="mt-2 font-headline text-lg font-semibold">
                Issuer trusted
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
              <PrimaryButton href="/issued">Sign to verify</PrimaryButton>
              <SecondaryButton href="/">Return to dapp</SecondaryButton>
            </div>

            <div className="mt-8 rounded-2xl bg-surface-container-lowest p-4">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Request digest
              </div>
              <code className="mt-3 block break-all text-xs text-primary">
                0x9f2e...d4c1 | SIGN_REQ_AGE_OVER_18 | NONCE: 82294
              </code>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
