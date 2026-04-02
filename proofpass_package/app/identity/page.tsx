"use client";

import { KycAttestationFlow } from "../../components/kyc-attestation-flow";
import { PageIntro, PageShell } from "../../components/proofpass-ui";

export default function IdentityPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Identity Issuance"
        title={
          <>
            Verify age from a{" "}
            <span className="bg-proof-gradient bg-clip-text text-transparent">
              real ID or passport
            </span>
          </>
        }
        body="Upload the document to the OCR verifier, confirm the extracted details, then store only a verifier-backed age attestation on-chain. The chain gets the age claim, not the full document."
      />

      <KycAttestationFlow mode="identity" />
    </PageShell>
  );
}
