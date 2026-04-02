export const ANVIL_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31338");
export const ANVIL_CHAIN_ID_HEX = `0x${ANVIL_CHAIN_ID.toString(16)}`;
export const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL ??
  "http://127.0.0.1:8546";
export const ANVIL_CHAIN_NAME =
  process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Anvil Local";
export const ANVIL_CURRENCY = {
  name: process.env.NEXT_PUBLIC_CHAIN_CURRENCY_NAME ?? "Ether",
  symbol: process.env.NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL ?? "ETH",
  decimals: 18,
};

export const DEFAULT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const DEFAULT_VERIFIER_ADDRESS =
  process.env.NEXT_PUBLIC_KYC_VERIFIER_ADDRESS ??
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

export const proofPassRegistryAbi = [
  {
    type: "event",
    name: "AttestationAccepted",
    anonymous: false,
    inputs: [
      { name: "attestationKey", type: "bytes32", indexed: true },
      { name: "digest", type: "bytes32", indexed: true },
      { name: "verifier", type: "address", indexed: true },
      { name: "subject", type: "address", indexed: false },
      { name: "isOver18", type: "bool", indexed: false },
      { name: "expiresAt", type: "uint64", indexed: false },
      { name: "commitment", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "function",
    name: "trustedVerifiers",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getSubjectVerification",
    stateMutability: "view",
    inputs: [{ name: "subject", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "subject", type: "address" },
          { name: "isOver18", type: "bool" },
          { name: "quality", type: "uint8" },
          { name: "commitment", type: "bytes32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "nonce", type: "uint256" },
          { name: "verifier", type: "address" },
          { name: "digest", type: "bytes32" },
          { name: "attestationKey", type: "bytes32" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "submitAttestation",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "attestation",
        type: "tuple",
        components: [
          { name: "subject", type: "address" },
          { name: "isOver18", type: "bool" },
          { name: "quality", type: "uint8" },
          { name: "commitment", type: "bytes32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "nonce", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "digest", type: "bytes32" },
      { name: "attestationKey", type: "bytes32" },
      { name: "verifier", type: "address" },
    ],
  },
] as const;

export type ProofPassPublicAttestation = {
  subject: string;
  isOver18: boolean;
  quality: number;
  commitment: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type ProofPassSubmissionEnvelope = {
  contractAddress: string;
  verifier: string;
  signature: string;
};

export type RegistryAttestationEvent = {
  attestationKey: string;
  digest: string;
  verifier: string;
  subject: string;
  isOver18: boolean;
  expiresAt: bigint;
  commitment: string;
  transactionHash: string;
  blockNumber: number;
};

export type RegistrySubjectVerification = {
  subject: string;
  isOver18: boolean;
  quality: number;
  commitment: string;
  issuedAt: bigint;
  expiresAt: bigint;
  nonce: bigint;
  verifier: string;
  digest: string;
  attestationKey: string;
  exists: boolean;
};
