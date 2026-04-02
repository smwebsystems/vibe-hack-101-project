"use client";

import { BrowserProvider, Contract, parseUnits } from "ethers";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_VERIFIER_ADDRESS,
  proofPassRegistryAbi,
  type ProofPassPublicAttestation,
  type ProofPassSubmissionEnvelope,
} from "./proofpass-contract";
import { useProofPassRuntimeConfig } from "./proofpass-runtime";
import {
  describeWalletError,
  ensureConfiguredNetwork,
  getInjectedEthereum,
  requestConnectedWallet,
} from "./proofpass-wallet";
import { ActionButton, Panel, SecondaryButton } from "./proofpass-ui";

type OcrApiMrz = {
  format: string;
  document_code: string;
  issuing_country: string;
  document_number: string;
  nationality: string;
  date_of_birth: string;
  expiry_date: string;
  sex: string;
  surnames: string;
  given_names: string;
  valid_document_number_check: boolean;
  valid_birth_check: boolean;
  valid_expiry_check: boolean;
};

type OcrApiResponse = {
  full_text: string;
  name: string;
  date_of_birth: string;
  mrz_raw: string;
  mrz: OcrApiMrz | null;
  kyc_data_hash: string;
  commitment_salt: string;
  attestation: ProofPassPublicAttestation | null;
  submission: ProofPassSubmissionEnvelope | null;
  model: string;
};

type KycMatchResult = {
  dobMatches: boolean;
  extractedName: string;
  kycConfirmed: boolean;
  nameMatches: boolean;
};

type SaIdInterpretation = {
  dateOfBirth: string;
  sex: "Female" | "Male";
  citizenship: "SA Citizen" | "Permanent Resident";
  valid: boolean;
};

type KycAttestationFlowProps = {
  mode: "identity" | "debug";
};

function computeIsOver18(dob: string) {
  if (!dob) {
    return false;
  }

  const now = new Date();
  const birthDate = new Date(dob);
  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() &&
      now.getDate() >= birthDate.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age >= 18;
}

function normalizePersonName(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareNames(expectedName: string, extractedName: string) {
  const normalizedExpected = normalizePersonName(expectedName);
  const normalizedExtracted = normalizePersonName(extractedName);

  if (!normalizedExpected || !normalizedExtracted) {
    return false;
  }

  const expectedParts = normalizedExpected.split(" ").filter(Boolean);
  const extractedParts = normalizedExtracted.split(" ").filter(Boolean);

  return expectedParts.every((part) =>
    extractedParts.some(
      (candidate) =>
        candidate === part ||
        candidate.includes(part) ||
        part.includes(candidate),
    ),
  );
}

function normalizeIdNumber(text: string) {
  const normalizedText = text
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[I|L]/g, "1");
  const digitGroups = normalizedText.match(/\b\d{6,17}\b/g) ?? [];

  const southAfricanId = digitGroups.find((group) => group.length === 13);
  if (southAfricanId) {
    return southAfricanId;
  }

  return digitGroups[0] ?? "";
}

function buildDisplayText(payload: OcrApiResponse) {
  return [payload.full_text, payload.mrz_raw].filter(Boolean).join("\n\n---\n\n");
}

function buildJsonPreview(attestation: ProofPassPublicAttestation | null) {
  if (!attestation) {
    return `{\n  "subject": "",\n  "isOver18": false,\n  "quality": 0,\n  "commitment": "",\n  "issuedAt": 0,\n  "expiresAt": 0,\n  "nonce": ""\n}`;
  }

  return JSON.stringify(attestation, null, 2);
}

function luhnCheck(value: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (Number.isNaN(digit)) {
      return false;
    }

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function buildIsoDob(year: number, month: number, day: number) {
  const candidate = new Date(
    `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`,
  );

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }

  return `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function interpretSouthAfricanId(idNumber: string): SaIdInterpretation | null {
  if (!/^\d{13}$/.test(idNumber)) {
    return null;
  }

  const yy = Number(idNumber.slice(0, 2));
  const month = Number(idNumber.slice(2, 4));
  const day = Number(idNumber.slice(4, 6));
  const sequence = Number(idNumber.slice(6, 10));
  const citizenshipDigit = idNumber[10];
  const currentYear = new Date().getFullYear();
  const currentTwoDigitYear = currentYear % 100;
  const fullYear = yy <= currentTwoDigitYear ? 2000 + yy : 1900 + yy;
  const dateOfBirth = buildIsoDob(fullYear, month, day);

  if (!dateOfBirth) {
    return null;
  }

  return {
    dateOfBirth,
    sex: sequence >= 5000 ? "Male" : "Female",
    citizenship: citizenshipDigit === "0" ? "SA Citizen" : "Permanent Resident",
    valid: luhnCheck(idNumber),
  };
}

function shortenHex(value: string, size = 8) {
  if (!value) {
    return "n/a";
  }
  if (value.length <= size * 2 + 2) {
    return value;
  }
  return `${value.slice(0, size + 2)}...${value.slice(-size)}`;
}

function normalizeHexBytes(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

async function buildFeeOverrides(provider: BrowserProvider) {
  const feeData = await provider.getFeeData();
  const minPriorityFeePerGas = parseUnits("25", "gwei");
  const priorityFeePerGas =
    feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minPriorityFeePerGas
      ? feeData.maxPriorityFeePerGas
      : minPriorityFeePerGas;
  const baseMaxFeePerGas = feeData.maxFeePerGas ?? priorityFeePerGas * 2n;
  const maxFeePerGas =
    baseMaxFeePerGas > priorityFeePerGas ? baseMaxFeePerGas : priorityFeePerGas * 2n;

  return {
    maxFeePerGas,
    maxPriorityFeePerGas: priorityFeePerGas,
  };
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "active" | "success" | "danger";
  children: ReactNode;
}) {
  const className =
    tone === "active"
      ? "bg-primary/10 text-primary"
      : tone === "success"
        ? "bg-tertiary/10 text-tertiary"
        : tone === "danger"
          ? "bg-danger/10 text-danger"
          : "bg-surface-container-low text-on-surface-variant";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 font-label text-[10px] uppercase tracking-[0.18em] ${className}`}
    >
      {tone === "active" ? (
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
      ) : null}
      {children}
    </div>
  );
}

export function KycAttestationFlow({ mode }: KycAttestationFlowProps) {
  const {
    config: runtimeConfig,
    isLoading: isRuntimeConfigLoading,
    loadError: runtimeConfigError,
  } = useProofPassRuntimeConfig();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);
  const [walletDismissed, setWalletDismissed] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [claimedDob, setClaimedDob] = useState("");
  const [claimedName, setClaimedName] = useState("");
  const [subjectWallet, setSubjectWallet] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [quality, setQuality] = useState(0);
  const [extractedName, setExtractedName] = useState("");
  const [mrzResult, setMrzResult] = useState<OcrApiMrz | null>(null);
  const [modelUsed, setModelUsed] = useState("");
  const [attestation, setAttestation] =
    useState<ProofPassPublicAttestation | null>(null);
  const [submission, setSubmission] =
    useState<ProofPassSubmissionEnvelope | null>(null);
  const [txHash, setTxHash] = useState("");
  const [walletError, setWalletError] = useState("");
  const [walletNotice, setWalletNotice] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [finalStatus, setFinalStatus] = useState<"success" | "failed" | null>(null);
  const [finalMessage, setFinalMessage] = useState("");

  useEffect(() => {
    const ethereum = getInjectedEthereum();
    setHasInjectedWallet(Boolean(ethereum));
    if (!ethereum || walletDismissed) {
      return;
    }

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const current = (accounts as string[])[0]?.toLowerCase() ?? "";
        setConnectedWallet(current);
        if ((mode === "identity" || !subjectWallet) && current) {
          setSubjectWallet(current);
        }
      })
      .catch(() => undefined);
  }, [mode, subjectWallet, walletDismissed]);

  const saIdInterpretation = useMemo(
    () => interpretSouthAfricanId(idNumber),
    [idNumber],
  );

  const kycMatch = useMemo<KycMatchResult | null>(() => {
    if (!claimedName && !claimedDob) {
      return null;
    }

    const mrzName = mrzResult
      ? [mrzResult.given_names, mrzResult.surnames].filter(Boolean).join(" ")
      : "";
    const resolvedName = mrzName || extractedName;
    const dobMatches = Boolean(claimedDob && dob && claimedDob === dob);
    const nameMatches = Boolean(claimedName && compareNames(claimedName, resolvedName));

    return {
      dobMatches,
      extractedName: resolvedName,
      kycConfirmed:
        Boolean(claimedDob ? dobMatches : true) &&
        Boolean(claimedName ? nameMatches : true),
      nameMatches,
    };
  }, [claimedDob, claimedName, dob, extractedName, mrzResult]);

  async function connectWallet() {
    setIsConnecting(true);
    setWalletError("");
    setWalletNotice("");
    setWalletDismissed(false);

    try {
      const wallet = await requestConnectedWallet();
      const networkResult = await ensureConfiguredNetwork(runtimeConfig);
      setConnectedWallet(wallet);
      if (mode === "identity" || !subjectWallet) {
        setSubjectWallet(wallet);
      }
      setWalletNotice(
        networkResult === "already-active"
          ? `${runtimeConfig.chainName} already active in wallet.`
          : networkResult === "switched"
            ? `Switched wallet to ${runtimeConfig.chainName}.`
            : `Added ${runtimeConfig.chainName} to the wallet.`,
      );
    } catch (connectError) {
      setWalletError(describeWalletError(connectError));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleAddAnvil() {
    setIsAddingNetwork(true);
    setWalletError("");
    setWalletNotice("");

    try {
      const networkResult = await ensureConfiguredNetwork(runtimeConfig);
      setWalletNotice(
        networkResult === "already-active"
          ? `${runtimeConfig.chainName} already active in wallet.`
          : networkResult === "switched"
            ? `Switched wallet to ${runtimeConfig.chainName}.`
            : `Added ${runtimeConfig.chainName} to the wallet.`,
      );
    } catch (networkError) {
      setWalletError(describeWalletError(networkError));
    } finally {
      setIsAddingNetwork(false);
    }
  }

  function forgetWalletInApp() {
    setWalletDismissed(true);
    setConnectedWallet("");
    setSubjectWallet("");
    setWalletError("");
    setWalletNotice(
      "Wallet cleared from this app session. To fully disconnect, remove this site from the wallet extension.",
    );
  }

  async function loadImage(file: File) {
    const url = URL.createObjectURL(file);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl(url);
    setSelectedFile(file);
    setFileName(file.name);
    setOcrText("");
    setDob("");
    setIdNumber("");
    setExtractedName("");
    setQuality(0);
    setMrzResult(null);
    setModelUsed("");
    setAttestation(null);
    setSubmission(null);
    setTxHash("");
    setError("");
    setWalletError("");
    setWalletNotice("");
    setFinalStatus(null);
    setFinalMessage("");
    setCurrentStep(1);
  }

  async function runOcr() {
    setIsRunning(true);
    setError("");
    setTxHash("");
    setFinalStatus(null);
    setFinalMessage("");

    try {
      if (!claimedName.trim() || !claimedDob.trim()) {
        throw new Error(
          "Enter the claimed name and claimed date of birth before extraction.",
        );
      }
      if (!selectedFile) {
        throw new Error("Upload an image before running OCR.");
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(subjectWallet.trim())) {
        throw new Error("Enter a valid subject wallet address.");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject", subjectWallet.trim());

      const response = await fetch(`${runtimeConfig.ocrApiBaseUrl}/ocr/id-card/file`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as OcrApiResponse | { detail?: string };

      if (!response.ok) {
        const detail =
          typeof payload === "object" && payload && "detail" in payload
            ? payload.detail
            : "OCR API request failed.";
        throw new Error(detail || "OCR API request failed.");
      }

      const parsedPayload = payload as OcrApiResponse;
      const resolvedIdNumber =
        parsedPayload.mrz?.document_number ||
        normalizeIdNumber(`${parsedPayload.full_text} ${parsedPayload.mrz_raw}`);

      setOcrText(buildDisplayText(parsedPayload));
      setDob(parsedPayload.date_of_birth || "");
      setExtractedName(parsedPayload.name || "");
      setIdNumber(resolvedIdNumber);
      setMrzResult(parsedPayload.mrz);
      setModelUsed(parsedPayload.model);
      setAttestation(parsedPayload.attestation);
      setSubmission(parsedPayload.submission);
      setQuality(parsedPayload.attestation?.quality ?? 0);

      if (!parsedPayload.attestation || !parsedPayload.submission) {
        setError(
          "The OCR API responded, but no signed attestation envelope was returned. Check the backend verifier and contract configuration.",
        );
      }
    } catch (ocrError) {
      setError(
        ocrError instanceof Error ? ocrError.message : "OCR API request failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function storeOnChain() {
    setIsStoring(true);
    setWalletError("");
    setWalletNotice("");
    setError("");
    setFinalStatus(null);
    setFinalMessage("");

    try {
      const ethereum = getInjectedEthereum();
      if (!ethereum) {
        throw new Error("MetaMask or another browser wallet is required.");
      }
      if (!attestation || !submission) {
        throw new Error("Run extraction first to generate a signed attestation.");
      }
      if (submission.verifier.toLowerCase() === attestation.subject.toLowerCase()) {
        throw new Error("Verifier must be different from the attestation subject.");
      }

      await ensureConfiguredNetwork(runtimeConfig);

      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const feeOverrides = await buildFeeOverrides(provider);
      const signerAddress = (await signer.getAddress()).toLowerCase();
      setConnectedWallet(signerAddress);

      if (signerAddress !== attestation.subject.toLowerCase()) {
        throw new Error("Connected wallet must match the attestation subject.");
      }

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== runtimeConfig.chainId) {
        throw new Error(`Switch the wallet to ${runtimeConfig.chainName} first.`);
      }

      const contract = new Contract(
        submission.contractAddress || runtimeConfig.contractAddress,
        proofPassRegistryAbi,
        signer,
      );

      const tx = await contract.submitAttestation(
        {
          subject: attestation.subject,
          isOver18: attestation.isOver18,
          quality: attestation.quality,
          commitment: attestation.commitment,
          issuedAt: attestation.issuedAt,
          expiresAt: attestation.expiresAt,
          nonce: BigInt(attestation.nonce),
        },
        normalizeHexBytes(submission.signature),
        feeOverrides,
      );

      setTxHash(tx.hash);
      await tx.wait();
      setFinalStatus("success");
      setFinalMessage(tx.hash);
      setCurrentStep(3);
    } catch (storeError) {
      const message = describeWalletError(storeError);
      setWalletError(
        message,
      );
      setFinalStatus("failed");
      setFinalMessage(message);
      setCurrentStep(3);
    } finally {
      setIsStoring(false);
    }
  }

  function restartFlow() {
    setCurrentStep(1);
    setFinalStatus(null);
    setFinalMessage("");
    setTxHash("");
    setError("");
    setWalletError("");
    setWalletNotice("");
  }

  const canAdvanceFromStepOne =
    Boolean(claimedName.trim()) &&
    Boolean(claimedDob.trim()) &&
    (mode === "identity"
      ? Boolean(connectedWallet)
      : /^0x[a-fA-F0-9]{40}$/.test(subjectWallet.trim())) &&
    Boolean(selectedFile);

  const canStoreAttestation =
    Boolean(attestation) &&
    Boolean(submission) &&
    Boolean(kycMatch?.kycConfirmed);
  const contractAddress = submission?.contractAddress || runtimeConfig.contractAddress;
  const verifierAddress = submission?.verifier || runtimeConfig.verifierAddress;

  const copy =
    mode === "identity"
        ? {
          wizardTitle: "Issue a verifier-backed age credential",
          wizardBody:
            "Move from claimed identity to verified age in three steps. The uploaded document is sent to the OCR verifier off-chain, then only the signed age attestation is anchored on-chain.",
          stepOneTitle: "1. Claimed identity",
          stepOneBody:
            "Enter the claimed name and date of birth, connect the wallet that should own the credential, then upload the ID or passport image.",
          stepOneAction: isRunning ? "Extracting and verifying..." : "Extract and verify",
          stepTwoTitle: "2. Review and store",
          stepTwoBody:
            "Review the extracted result, confirm it matches the claimed details, then store only the verifier-backed age attestation on-chain.",
          sourcePlaceholder:
            "Upload an ID or passport image. The file will be sent to the OCR verifier to extract the holder details and prepare the age credential.",
          primaryAction:
            isRunning ? "Extracting and preparing..." : "Run extraction and verify",
          returnHref: "/",
          returnLabel: "Return home",
          reviewTitle: "Extraction review",
          reviewBody:
            "Review the identity data returned by the OCR verifier before storing anything. Only the public attestation is intended for contract storage.",
          publicTitle: "Contract attestation",
          publicBody:
            "This is the contract-facing object that locks the verified age claim to the subject wallet.",
          storeAction:
            isStoring ? "Submitting credential..." : "Store verified age on-chain",
          successTitle: "3. Credential stored",
          successBody:
            "This wallet now has a verifier-backed age attestation on-chain. Use the verify page to confirm it by wallet address.",
          successHref: "/verify",
          successLabel: "Open verify page",
          failedTitle: "3. Credential failed",
          failedBody:
            "The credential was not stored. Review the failure reason, then return to step 2 to try again.",
        }
      : {
          wizardTitle: "Debug the OCR-to-attestation path",
          wizardBody:
            "This sandbox exposes raw extraction details, parsed fields, and the final attestation envelope so you can inspect the full flow.",
          stepOneTitle: "1. Claimed KYC input",
          stepOneBody:
            "Enter the claimed identity, choose the subject wallet, and upload the source image. The OCR verifier will extract the fields and sign only the public attestation fields.",
          stepOneAction: "Continue to OCR review",
          stepTwoTitle: "2. Extract, review, and store",
          stepTwoBody:
            "Run OCR, inspect the extracted fields, review the signed attestation, and optionally store it on-chain.",
          sourcePlaceholder:
            "Upload an ID or passport image to start the signed attestation flow.",
          primaryAction: isRunning ? "Calling OCR API..." : "Run OCR and sign",
          returnHref: "/identity",
          returnLabel: "Return to credential flow",
          reviewTitle: "OCR and operator review",
          reviewBody:
            "Raw OCR and extracted fields stay visible for operator review, but the on-chain object contains only the public attestation.",
          publicTitle: "Public attestation",
          publicBody:
            "This is the only object intended for contract submission. Private OCR fields stay off-chain.",
          storeAction: isStoring ? "Submitting transaction..." : "Store on-chain",
          successTitle: "3. Transaction submitted",
          successBody:
            "The signed attestation was accepted on-chain. Use the verify page or restart the sandbox for another run.",
          successHref: "/verify",
          successLabel: "Open verify page",
          failedTitle: "3. Transaction failed",
          failedBody:
            "The attestation was not stored. Review the failure reason, then return to step 2 to inspect the envelope and try again.",
        };

  const steps = [
    { number: 1, label: "Input" },
    { number: 2, label: "Verify" },
    { number: 3, label: "Result" },
  ];

  const stepTwoStatus = isStoring
    ? {
        tone: "active" as const,
        label: "Submitting on-chain",
        body: "The wallet confirmation was accepted. We are waiting for the network to store the verified age attestation.",
        next: "Wait for the transaction receipt.",
      }
    : isRunning
      ? {
          tone: "active" as const,
          label: "Extracting document",
          body: "We are reading the uploaded document, matching the claimed details, and preparing the verifier-backed attestation.",
          next: "Wait for the extraction result, then review the match state.",
        }
      : attestation
        ? {
            tone: canStoreAttestation ? ("success" as const) : ("danger" as const),
            label: canStoreAttestation ? "Ready to store" : "Review required",
            body: canStoreAttestation
              ? "Extraction is complete and the claimed details match. You can now store the verified age attestation on-chain."
              : "Extraction is complete, but the claimed details do not match closely enough yet. Review the extracted result before storing.",
            next: canStoreAttestation
              ? "Store the verified age on-chain."
              : "Inspect the extracted fields or retry extraction.",
          }
        : {
            tone: error || walletError ? ("danger" as const) : ("neutral" as const),
            label: error || walletError ? "Retry needed" : "Ready to extract",
            body:
              error || walletError
                ? "The last attempt did not complete. Fix the issue below, then retry extraction."
                : "The document and claimed details are loaded. Start extraction to generate the verifier-backed attestation.",
            next:
              error || walletError
                ? "Retry extraction once the issue is resolved."
                : "Run extraction and verify the result.",
          };

  async function continueFromStepOne() {
    setError("");
    setWalletError("");
    setCurrentStep(2);

    if (mode === "identity") {
      await runOcr();
    }
  }

  return (
    <section className="space-y-6">
      <Panel className="rounded-[2.25rem]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-headline text-3xl font-bold">{copy.wizardTitle}</div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
              {copy.wizardBody}
            </p>
          </div>

          {mode === "debug" ? (
            <div className="flex flex-wrap gap-3">
              <ActionButton
                disabled={isConnecting || Boolean(connectedWallet)}
                onClick={connectWallet}
                tone="secondary"
              >
                {connectedWallet
                  ? "Wallet connected"
                  : isConnecting
                    ? "Connecting..."
                    : "Connect wallet"}
              </ActionButton>
              <ActionButton
                disabled={isAddingNetwork}
                onClick={handleAddAnvil}
                tone="secondary"
              >
                {isAddingNetwork
                  ? `Adding ${runtimeConfig.chainName}...`
                  : `Add ${runtimeConfig.chainName} Network`}
              </ActionButton>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const active = currentStep === step.number;
            const complete = currentStep > step.number;

            return (
              <div
                key={step.number}
                className={`rounded-[1.5rem] border px-4 py-4 steady-transition ${
                  active
                    ? "border-primary/40 bg-primary/10"
                    : complete
                      ? "border-tertiary/30 bg-tertiary/10"
                      : "border-white/8 bg-surface-container-low"
                }`}
              >
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Step {step.number}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-headline text-xl font-bold">{step.label}</div>
                  <div
                    className={`h-9 w-9 rounded-full border text-center font-headline text-sm font-bold leading-9 ${
                      active
                        ? "border-primary/40 text-primary"
                        : complete
                          ? "border-tertiary/40 text-tertiary"
                          : "border-white/10 text-on-surface-variant"
                    }`}
                  >
                    {complete ? "✓" : step.number}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {currentStep === 1 ? (
        <section className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Panel className="rounded-[2.25rem]">
              <div className="font-headline text-2xl font-bold">{copy.stepOneTitle}</div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {copy.stepOneBody}
              </p>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <label className="block rounded-[1.5rem] bg-surface-container-low p-4">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Claimed name
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setClaimedName(event.target.value)}
                    placeholder="Jane Mary Example"
                    value={claimedName}
                  />
                </label>

                <label className="block rounded-[1.5rem] bg-surface-container-low p-4">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Claimed DOB
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setClaimedDob(event.target.value)}
                    placeholder="YYYY-MM-DD"
                    value={claimedDob}
                  />
                </label>
              </div>

              {mode === "debug" ? (
                <label className="mt-4 block rounded-[1.5rem] bg-surface-container-low p-4">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Subject wallet
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 font-mono text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setSubjectWallet(event.target.value)}
                    placeholder="0x..."
                    value={subjectWallet}
                  />
                </label>
              ) : null}

              <div className="mt-6 rounded-[1.75rem] bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Document upload
                  </div>
                  <code className="text-sm text-primary">{fileName || "No file selected"}</code>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-surface-container-lowest">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Uploaded ID preview"
                      className="block max-h-[420px] w-full object-contain"
                      src={imageUrl}
                    />
                  ) : (
                    <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
                      {copy.sourcePlaceholder}
                    </div>
                  )}
                </div>

                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-soft bg-proof-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-[0.14em] text-on-primary steady-transition hover:brightness-110">
                  Select image
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      await loadImage(file);
                    }}
                    type="file"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-4 md:flex-row">
                <ActionButton
                  disabled={!canAdvanceFromStepOne || (mode === "identity" && isRunning)}
                  onClick={continueFromStepOne}
                >
                  {copy.stepOneAction}
                </ActionButton>

                {mode === "debug" ? (
                  <SecondaryButton href={copy.returnHref}>{copy.returnLabel}</SecondaryButton>
                ) : null}
              </div>
            </Panel>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Panel className="rounded-[2.25rem] bg-surface-container-low">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                {mode === "identity" ? "Connected wallet" : "Wallet and network"}
              </div>
              <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-4">
                  <span>Wallet provider</span>
                  <code className={hasInjectedWallet ? "text-tertiary" : "text-danger"}>
                    {hasInjectedWallet ? "Detected" : "Not detected"}
                  </code>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Connected wallet</span>
                  <code className="text-primary">
                    {connectedWallet ? shortenHex(connectedWallet) : "Not connected"}
                  </code>
                </div>
                {mode === "identity" ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>Credential owner</span>
                    <code className="text-primary">
                      {connectedWallet ? shortenHex(connectedWallet) : "Connect first"}
                    </code>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span>Required chain</span>
                  <code className="text-primary">
                    {runtimeConfig.chainName} ({runtimeConfig.chainId})
                  </code>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Verifier</span>
                  <code className="text-primary">
                    {shortenHex(verifierAddress || DEFAULT_VERIFIER_ADDRESS)}
                  </code>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>OCR API</span>
                  <code className="text-primary">
                    {runtimeConfig.ocrApiBaseUrl.replace(/^https?:\/\//, "")}
                  </code>
                </div>
              </div>

              {mode === "identity" ? (
                <div className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row">
                  <ActionButton
                    disabled={isConnecting || Boolean(connectedWallet)}
                    onClick={connectWallet}
                    tone="secondary"
                    >
                      {connectedWallet
                        ? "Wallet connected"
                        : isConnecting
                          ? "Connecting..."
                          : "Connect wallet"}
                    </ActionButton>
                    <ActionButton
                      disabled={isAddingNetwork}
                      onClick={handleAddAnvil}
                      tone="secondary"
                    >
                      {isAddingNetwork
                        ? `Adding ${runtimeConfig.chainName}...`
                        : `Add ${runtimeConfig.chainName} Network`}
                    </ActionButton>
                    {connectedWallet ? (
                      <ActionButton onClick={forgetWalletInApp} tone="secondary">
                        Forget wallet in app
                      </ActionButton>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    The connected wallet becomes the credential owner. Network switching happens automatically when needed. To fully disconnect, remove this site from the wallet extension.
                  </p>
                </div>
              ) : null}
            </Panel>

            <Panel className="rounded-[2.25rem] bg-surface-container-low">
              <div className="font-headline text-xl font-bold">What happens next</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
                <p>We extract the document fields and compare them to the claimed name and birth date.</p>
                <p>The verifier signs the public age claim off-chain.</p>
                <p>Only the age attestation is written to the contract.</p>
              </div>
            </Panel>

            {walletError ? (
              <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                {walletError}
              </div>
            ) : null}
            {walletNotice ? (
              <div className="rounded-[1.5rem] bg-tertiary/10 px-4 py-4 text-sm leading-6 text-tertiary">
                {walletNotice}
              </div>
            ) : null}
            {isRuntimeConfigLoading ? (
              <div className="rounded-[1.5rem] bg-primary/10 px-4 py-4 text-sm leading-6 text-primary">
                Loading live chain and OCR config.
              </div>
            ) : null}
            {runtimeConfigError ? (
              <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                Live OCR config could not be loaded. Using fallback values. {runtimeConfigError}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <Panel className="rounded-[2.25rem]">
              <div className="font-headline text-2xl font-bold">{copy.stepTwoTitle}</div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {copy.stepTwoBody}
              </p>

              <div className="mt-6 rounded-[1.75rem] bg-surface-container-low p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <StatusPill tone={stepTwoStatus.tone}>{stepTwoStatus.label}</StatusPill>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Current step: verify
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-on-surface">
                  {stepTwoStatus.body}
                </p>
                <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-primary">
                  Next: {stepTwoStatus.next}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Claimed name
                  </div>
                  <div className="mt-2 text-base text-on-surface">{claimedName}</div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Claimed DOB
                  </div>
                  <div className="mt-2 text-base text-on-surface">{claimedDob}</div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] bg-surface-container-low p-4">
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {mode === "identity" ? "Credential owner wallet" : "Subject wallet"}
                </div>
                <div className="mt-2 break-all font-mono text-sm text-on-surface">
                  {subjectWallet}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-surface-container-low">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Uploaded ID preview"
                    className="block max-h-[360px] w-full object-contain"
                    src={imageUrl}
                  />
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {!attestation ? (
                  <ActionButton disabled={isRunning} onClick={runOcr}>
                    {mode === "identity" ? "Try extraction again" : copy.primaryAction}
                  </ActionButton>
                ) : (
                  <ActionButton
                    disabled={!canStoreAttestation || isStoring}
                    onClick={storeOnChain}
                  >
                    {copy.storeAction}
                  </ActionButton>
                )}

                <div className="flex flex-col gap-3 md:flex-row">
                  <ActionButton
                    disabled={isRunning || isStoring}
                    onClick={() => setCurrentStep(1)}
                    tone="secondary"
                  >
                    Back to input
                  </ActionButton>
                  {mode === "debug" ? (
                    <SecondaryButton href={copy.returnHref}>{copy.returnLabel}</SecondaryButton>
                  ) : null}
                </div>
              </div>
            </Panel>

            {error ? (
              <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                {error}
              </div>
            ) : null}
            {walletError ? (
              <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                {walletError}
              </div>
            ) : null}
          </div>

          <div className="space-y-6 lg:col-span-7">
            <Panel className="rounded-[2.25rem]">
              <div className="font-headline text-2xl font-bold">{copy.reviewTitle}</div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {copy.reviewBody}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Extraction
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {isRunning ? "Running" : attestation ? "Complete" : "Pending"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Match check
                  </div>
                  <div
                    className={`mt-2 font-headline text-lg font-bold ${
                      !attestation
                        ? "text-on-surface"
                        : canStoreAttestation
                          ? "text-tertiary"
                          : "text-danger"
                    }`}
                  >
                    {!attestation ? "Pending" : canStoreAttestation ? "Pass" : "Mismatch"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Chain store
                  </div>
                  <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                    {isStoring ? "Submitting" : txHash ? "Stored" : "Pending"}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Quality
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-primary">
                    {quality}%
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Over 18
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-tertiary">
                    {dob ? (computeIsOver18(dob) ? "true" : "false") : "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    ID detected
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-primary">
                    {idNumber ? "true" : "false"}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Extracted name
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setExtractedName(event.target.value)}
                    value={extractedName}
                  />
                </label>

                <label className="block">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Extracted DOB
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setDob(event.target.value)}
                    value={dob}
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Document number
                </span>
                <input
                  className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                  onChange={(event) => setIdNumber(event.target.value)}
                  value={idNumber}
                />
              </label>

              {mode === "debug" ? (
                <label className="mt-4 block">
                  <span className="ml-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    OCR text
                  </span>
                  <textarea
                    className="mt-2 min-h-[140px] w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none ring-1 ring-transparent steady-transition focus:ring-primary/30"
                    onChange={(event) => setOcrText(event.target.value)}
                    placeholder="OCR output will appear here..."
                    value={ocrText}
                  />
                </label>
              ) : null}
            </Panel>

            <Panel className="rounded-[2.25rem] bg-surface-container-low">
              <div className="font-headline text-2xl font-bold">KYC confirmation</div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Compare the claimed name and date of birth against the extracted result before storing the attestation.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Name match
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-on-surface">
                    {kycMatch ? (kycMatch.nameMatches ? "true" : "false") : "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    DOB match
                  </div>
                  <div className="mt-2 font-headline text-2xl font-bold text-on-surface">
                    {kycMatch ? (kycMatch.dobMatches ? "true" : "false") : "n/a"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Ready to store
                  </div>
                  <div
                    className={`mt-2 font-headline text-2xl font-bold ${
                      kycMatch?.kycConfirmed ? "text-tertiary" : "text-danger"
                    }`}
                  >
                    {kycMatch ? (kycMatch.kycConfirmed ? "true" : "false") : "n/a"}
                  </div>
                </div>
              </div>

              {kycMatch ? (
                <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                  Claimed name:
                  <br />
                  <code className="text-primary">{claimedName || "n/a"}</code>
                  <br />
                  Extracted name:
                  <br />
                  <code className="text-primary">{kycMatch.extractedName || "n/a"}</code>
                  <br />
                  Claimed DOB / extracted DOB:
                  <br />
                  <code className="text-primary">
                    {claimedDob || "n/a"} / {dob || "n/a"}
                  </code>
                </div>
              ) : null}
            </Panel>

            <Panel className="rounded-[2.25rem] bg-surface-container-low">
              <div className="font-headline text-2xl font-bold">{copy.publicTitle}</div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {copy.publicBody}
              </p>

              {mode === "identity" ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Claim
                    </div>
                    <div className="mt-2 font-headline text-lg font-semibold text-on-surface">
                      {attestation ? (attestation.isOver18 ? "Over 18 = true" : "Over 18 = false") : "Pending"}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Quality
                    </div>
                    <div className="mt-2 font-headline text-lg font-semibold text-on-surface">
                      {attestation ? `${attestation.quality}%` : "Pending"}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Contract
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-on-surface">
                      {contractAddress || DEFAULT_CONTRACT_ADDRESS}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Verifier
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-on-surface">
                      {verifierAddress || DEFAULT_VERIFIER_ADDRESS}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <pre className="mt-5 overflow-x-auto rounded-[1.5rem] bg-surface-container-lowest p-4 text-xs leading-6 text-primary">
                    {buildJsonPreview(attestation)}
                  </pre>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                      <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Contract
                      </div>
                      <div className="mt-2 break-all font-mono text-sm text-on-surface">
                        {contractAddress || DEFAULT_CONTRACT_ADDRESS}
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                      <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Verifier
                      </div>
                      <div className="mt-2 break-all font-mono text-sm text-on-surface">
                        {verifierAddress || DEFAULT_VERIFIER_ADDRESS}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6">
                <ActionButton
                  disabled={!canStoreAttestation || isStoring}
                  onClick={storeOnChain}
                >
                  {copy.storeAction}
                </ActionButton>
              </div>
            </Panel>

            {mode === "debug" ? (
              <Panel className="rounded-[2.25rem] bg-surface-container-low">
                <div className="font-headline text-2xl font-bold">Optional debug interpretation</div>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  These helpers stay off-chain. They help the operator judge whether the OCR result is plausible before storage.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      13-digit ID
                    </div>
                    <div className="mt-2 text-sm leading-6 text-on-surface">
                      {saIdInterpretation ? (
                        <>
                          DOB: {saIdInterpretation.dateOfBirth}
                          <br />
                          Sex: {saIdInterpretation.sex}
                          <br />
                          Citizenship: {saIdInterpretation.citizenship}
                          <br />
                          Luhn: {saIdInterpretation.valid ? "valid" : "invalid"}
                        </>
                      ) : (
                        "No South African 13-digit interpretation available."
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      MRZ
                    </div>
                    <div className="mt-2 text-sm leading-6 text-on-surface">
                      {mrzResult ? (
                        <>
                          Format: {mrzResult.format}
                          <br />
                          Document: {mrzResult.document_number || "n/a"}
                          <br />
                          DOB: {mrzResult.date_of_birth || "n/a"}
                          <br />
                          Expiry: {mrzResult.expiry_date || "n/a"}
                        </>
                      ) : (
                        "No MRZ interpretation available."
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            ) : null}
          </div>
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section className="mx-auto max-w-3xl">
          <Panel className="rounded-[2.5rem] bg-surface-container-low p-8 md:p-10">
            <div
              className={`inline-flex rounded-full px-4 py-2 font-label text-[10px] uppercase tracking-[0.18em] ${
                finalStatus === "success"
                  ? "bg-tertiary/10 text-tertiary"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {finalStatus === "success" ? "Verified and stored" : "Verification failed"}
            </div>

            <div className="mt-6 font-headline text-4xl font-bold">
              {finalStatus === "success" ? copy.successTitle : copy.failedTitle}
            </div>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              {finalStatus === "success" ? copy.successBody : copy.failedBody}
            </p>

            <div className="mt-8 rounded-[1.75rem] bg-surface-container-lowest p-5">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                {finalStatus === "success" ? "Transaction hash" : "Failure reason"}
              </div>
              <div
                className={`mt-3 break-all font-mono text-sm leading-6 ${
                  finalStatus === "success" ? "text-primary" : "text-danger"
                }`}
              >
                {finalStatus === "success" ? txHash || finalMessage : finalMessage || walletError || error}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 md:flex-row">
              {finalStatus === "success" ? (
                <SecondaryButton href={copy.successHref}>{copy.successLabel}</SecondaryButton>
              ) : (
                <ActionButton onClick={() => setCurrentStep(2)} tone="secondary">
                  Return to step 2
                </ActionButton>
              )}

              <ActionButton onClick={restartFlow} tone={finalStatus === "success" ? "secondary" : "primary"}>
                Start another run
              </ActionButton>
            </div>
          </Panel>
        </section>
      ) : null}
    </section>
  );
}
