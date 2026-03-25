export const navigation = [
  { href: "/", label: "Claims" },
  { href: "/verify", label: "Verify" },
  { href: "/gateway", label: "Wallet" },
  { href: "/issued", label: "Vault" },
];

export const flowSteps = [
  {
    id: "01",
    title: "Capture mock KYC data on-device",
    body: "Enter only local test identity data. Nothing raw leaves the device.",
  },
  {
    id: "02",
    title: "Encrypt and upload the payload",
    body: "AES encryption happens client-side, then the encrypted payload is pinned to IPFS.",
  },
  {
    id: "03",
    title: "Verify a single fact later",
    body: "The verifier gets a pass or fail answer. No birthdate, passport number, or raw identity record is revealed.",
  },
];

export const metadataStats = [
  { label: "Storage", value: "IPFS CID only" },
  { label: "Trust anchor", value: "Polygon Amoy" },
  { label: "Proof output", value: "Pass / Fail" },
];

export const proofFields = [
  { label: "Full Name", value: "Alexander Sterling", hidden: true },
  { label: "Date of Birth", value: "12 / 05 / 1988", hidden: true },
  { label: "Verification Claim", value: "Verified Over 18", hidden: false },
  { label: "Passport Number", value: "GBR-8829440X", hidden: true },
];

export const issuanceTimeline = [
  { label: "Encrypting Payload", detail: "AES-256 local encryption complete.", state: "done" },
  { label: "Uploading to IPFS", detail: "Content-addressed storage verified.", state: "done" },
  { label: "Requesting Issuer Signature", detail: "Awaiting trusted mock authority signature.", state: "active" },
  { label: "Anchoring on Polygon Amoy", detail: "Pending blockchain finality.", state: "pending" },
];
