export const navigation = [
  { href: "/", label: "Home" },
  { href: "/identity", label: "Issue" },
  { href: "/gateway", label: "Gateway" },
  { href: "/verify", label: "Verify" },
  { href: "/ocr-test", label: "OCR" },
];

export const flowSteps = [
  {
    id: "01",
    title: "Input mock KYC locally",
    body: "The user enters demo identity data on-device. Raw fields do not leave the browser.",
  },
  {
    id: "02",
    title: "Encrypt payload and derive credential",
    body: "The frontend encrypts the payload, derives a hash, produces a CID-like identifier, and prepares issuer metadata.",
  },
  {
    id: "03",
    title: "Prove one fact later",
    body: "The verifier receives only the requested claim result, not the full identity record behind it.",
  },
];

export const metadataStats = [
  { label: "Data leaves device", value: "Encrypted only" },
  { label: "Trust anchor", value: "Polygon Amoy" },
  { label: "Verifier result", value: "Pass / Fail" },
];

export const issuerName = "Trusted Mock Authority";
export const verifierAppName = "The Wine Cellar";
export const supportedClaimLabel = "Age over 18";
