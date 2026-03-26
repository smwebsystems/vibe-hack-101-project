"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type DemoIdentityInput = {
  fullName: string;
  dateOfBirth: string;
  documentId: string;
};

type CredentialRecord = {
  encryptedPayload: string;
  payloadHash: string;
  cid: string;
  issuerSignature: string;
  claimHash: string;
  txHash: string;
  walletAddress: string;
  issuedAt: string;
  ageYears: number;
  claimLabel: string;
  issuer: string;
  keyFingerprint: string;
};

type ProofRecord = {
  requestDigest: string;
  requestNonce: string;
  subjectSignature: string;
  verifierApp: string;
  verified: boolean;
  resultLabel: string;
};

type ProofPassState = {
  identity: DemoIdentityInput | null;
  credential: CredentialRecord | null;
  proof: ProofRecord | null;
};

type ProofPassContextValue = {
  state: ProofPassState;
  isBusy: boolean;
  createCredential: (input: DemoIdentityInput) => Promise<void>;
  createProof: () => Promise<void>;
  resetFlow: () => void;
};

const STORAGE_KEY = "proofpass-demo-state";
const walletAddress = "0x71C0b58B3C4A93492d";
const issuer = "Trusted Mock Authority";
const verifierApp = "The Wine Cellar";

const initialState: ProofPassState = {
  identity: null,
  credential: null,
  proof: null,
};

const ProofPassContext = createContext<ProofPassContextValue | null>(null);

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function sha256Hex(input: string) {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return arrayBufferToHex(digest);
}

function ageFromDate(dateOfBirth: string) {
  const now = new Date();
  const dob = new Date(dateOfBirth);
  let age = now.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

async function encryptPayload(payload: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(payload),
  );

  return {
    encryptedPayload: arrayBufferToBase64(encrypted),
    keyFingerprint: arrayBufferToHex(exportedKey).slice(0, 16),
    ivHex: arrayBufferToHex(iv.buffer),
  };
}

function buildCid(payloadHash: string) {
  return `bafy${payloadHash.slice(0, 28)}`;
}

function shortSig(prefix: string, value: string) {
  return `${prefix}_${value.slice(0, 18)}`;
}

export function ProofPassProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ProofPassState>(initialState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ProofPassState;
      setState(parsed);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<ProofPassContextValue>(
    () => ({
      state,
      isBusy: isPending,
      async createCredential(input) {
        const ageYears = ageFromDate(input.dateOfBirth);
        const claimLabel = ageYears >= 18 ? "Age over 18" : "Age under 18";
        const rawPayload = JSON.stringify({
          ...input,
          claimLabel,
          generatedAt: new Date().toISOString(),
        });
        const { encryptedPayload, ivHex, keyFingerprint } =
          await encryptPayload(rawPayload);
        const payloadHash = await sha256Hex(`${rawPayload}:${ivHex}`);
        const claimHash = await sha256Hex(`${payloadHash}:${claimLabel}`);
        const cid = buildCid(payloadHash);
        const issuerSignature = shortSig("ISS", await sha256Hex(`${claimHash}:${cid}:${issuer}`));
        const txHash = `0x${(await sha256Hex(`${payloadHash}:${walletAddress}`)).slice(0, 48)}`;

        await new Promise((resolve) => setTimeout(resolve, 900));

        startTransition(() => {
          setState({
            identity: input,
            credential: {
              encryptedPayload,
              payloadHash,
              cid,
              issuerSignature,
              claimHash,
              txHash,
              walletAddress,
              issuedAt: new Date().toISOString(),
              ageYears,
              claimLabel,
              issuer,
              keyFingerprint,
            },
            proof: null,
          });
        });
      },
      async createProof() {
        if (!state.credential) {
          return;
        }

        const requestNonce = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const requestDigest = `0x${(
          await sha256Hex(`${state.credential.claimHash}:${verifierApp}:${requestNonce}`)
        ).slice(0, 48)}`;
        const subjectSignature = shortSig(
          "SUBJ",
          await sha256Hex(`${requestDigest}:${state.credential.walletAddress}`),
        );
        const verified =
          state.credential.ageYears >= 18 &&
          state.credential.issuerSignature.startsWith("ISS_") &&
          state.credential.claimHash.length > 0;

        await new Promise((resolve) => setTimeout(resolve, 700));

        startTransition(() => {
          setState((current) => ({
            ...current,
            proof: {
              requestDigest,
              requestNonce,
              subjectSignature,
              verifierApp,
              verified,
              resultLabel: verified ? "Verified Over 18" : "Verification Failed",
            },
          }));
        });
      },
      resetFlow() {
        startTransition(() => {
          setState(initialState);
        });
      },
    }),
    [isPending, state],
  );

  return (
    <ProofPassContext.Provider value={value}>
      {children}
    </ProofPassContext.Provider>
  );
}

export function useProofPass() {
  const context = useContext(ProofPassContext);

  if (!context) {
    throw new Error("useProofPass must be used inside ProofPassProvider");
  }

  return context;
}
