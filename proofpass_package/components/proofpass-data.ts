export const navigation = [
  { href: "/", label: "Home" },
  { href: "/identity", label: "Issue" },
  { href: "/verify", label: "Verify" },
];

export const flowSteps = [
  {
    id: "01",
    title: "Upload identity evidence",
    body: "The user provides claimed details and uploads an ID or passport for OCR extraction and review.",
  },
  {
    id: "02",
    title: "Verify and sign age",
    body: "The verifier checks the extracted fields, derives a commitment, and signs the age attestation for the subject wallet.",
  },
  {
    id: "03",
    title: "Read result on-chain",
    body: "Later, a verifier checks the wallet and reads the stored age result, signer, and validity window from chain.",
  },
];

export const metadataStats = [
  { label: "Document path", value: "OCR review" },
  { label: "Trust anchor", value: "On-chain registry" },
  { label: "Verifier output", value: "Age + validity" },
];

export const issuerName = "Trusted Mock Authority";
export const verifierAppName = "The Wine Cellar";
export const supportedClaimLabel = "Age over 18";
