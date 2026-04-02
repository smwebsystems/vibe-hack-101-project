"use client";

import { JsonRpcProvider, Contract } from "ethers";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_VERIFIER_ADDRESS,
  proofPassRegistryAbi,
  type RegistrySubjectVerification,
} from "../../components/proofpass-contract";
import { useProofPassRuntimeConfig } from "../../components/proofpass-runtime";
import {
  describeWalletError,
  getInjectedEthereum,
  requestConnectedWallet,
} from "../../components/proofpass-wallet";
import {
  ActionButton,
  PageIntro,
  Panel,
  PageShell,
  SecondaryButton,
} from "../../components/proofpass-ui";

function shortenHex(value: string, size = 8) {
  if (!value) {
    return "n/a";
  }
  if (value.length <= size * 2 + 2) {
    return value;
  }
  return `${value.slice(0, size + 2)}...${value.slice(-size)}`;
}

function formatUnixTime(value: bigint) {
  if (!value) {
    return "n/a";
  }

  return new Date(Number(value) * 1000).toLocaleString();
}

function VerificationMetaCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
      <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </div>
      <div
        className={`mt-2 break-all text-sm text-on-surface ${
          mono ? "font-mono text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function isValidAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export default function VerifyPage() {
  const {
    config: runtimeConfig,
    isLoading: isRuntimeConfigLoading,
    loadError: runtimeConfigError,
  } = useProofPassRuntimeConfig();
  const [subjectWallet, setSubjectWallet] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);
  const [walletDismissed, setWalletDismissed] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [subjectVerification, setSubjectVerification] =
    useState<RegistrySubjectVerification | null>(null);

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
        if (!subjectWallet && current) {
          setSubjectWallet(current);
        }
      })
      .catch(() => undefined);
  }, [subjectWallet, walletDismissed]);

  const verificationStatus = useMemo(() => {
    if (!subjectVerification?.exists) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = Number(subjectVerification.expiresAt) <= now;
    const isTrustedVerifier =
      subjectVerification.verifier.toLowerCase() ===
      runtimeConfig.verifierAddress.toLowerCase();
    const verified =
      subjectVerification.isOver18 && !isExpired && isTrustedVerifier;

    return {
      isExpired,
      isTrustedVerifier,
      verified,
    };
  }, [runtimeConfig.verifierAddress, subjectVerification]);
  async function connectWallet() {
    setIsConnecting(true);
    setWalletError("");
    setWalletDismissed(false);

    try {
      if (connectedWallet) {
        setSubjectWallet(connectedWallet);
        return;
      }

      const wallet = await requestConnectedWallet();
      setConnectedWallet(wallet);
      setSubjectWallet(wallet);
    } catch (connectError) {
      setWalletError(describeWalletError(connectError));
    } finally {
      setIsConnecting(false);
    }
  }

  function forgetWalletInApp() {
    setWalletDismissed(true);
    setConnectedWallet("");
    setSubjectWallet("");
    setSubjectVerification(null);
    setWalletError(
      "Wallet cleared from this app session. To fully disconnect, remove this site from the wallet extension.",
    );
  }

  async function checkVerification() {
    setIsChecking(true);
    setWalletError("");
    setSubjectVerification(null);

    try {
      if (!isValidAddress(subjectWallet)) {
        throw new Error("Enter a valid subject wallet address.");
      }

      const provider = new JsonRpcProvider(runtimeConfig.rpcUrl);
      const contract = new Contract(
        runtimeConfig.contractAddress,
        proofPassRegistryAbi,
        provider,
      );

      const verification = (await contract.getSubjectVerification(
        subjectWallet.trim(),
      )) as RegistrySubjectVerification;

      if (!verification.exists) {
        throw new Error(
          "No verifier-backed age attestation was found for that wallet on this network.",
        );
      }

      const isTrusted = (await contract.trustedVerifiers(
        verification.verifier,
      )) as boolean;

      if (!isTrusted) {
        throw new Error("The stored verifier is not trusted by this registry.");
      }

      setSubjectVerification(verification);
    } catch (verificationError) {
      setWalletError(
        verificationError instanceof Error
          ? verificationError.message
          : "Verification lookup failed.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <PageShell>
      <PageIntro
        eyebrow="Verifier Check"
        title="Verify age from a wallet address"
        body="Enter the subject wallet and read the latest verifier-backed age attestation from chain. The verifier sees the age result, signer, and validity window, not the source document."
      />

      <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-6">
          <Panel className="rounded-[2.25rem]">
            <div className="font-headline text-2xl font-bold">
              1. Verification request
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              The verifier provides the subject wallet address. The app reads the
              attestation directly from chain with a view call. No personal data is
              requested here.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block rounded-[1.5rem] bg-surface-container-low p-4">
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

              <div className="rounded-[1.75rem] bg-surface-container-low p-5 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-4">
                  <span>Wallet provider</span>
                  <code className={hasInjectedWallet ? "text-tertiary" : "text-danger"}>
                    {hasInjectedWallet ? "Detected" : "Not detected"}
                  </code>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>Connected wallet</span>
                  <code className="text-primary">
                    {connectedWallet ? shortenHex(connectedWallet) : "Not connected"}
                  </code>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>Network</span>
                  <code className="text-primary">
                    {runtimeConfig.chainName} ({runtimeConfig.chainId})
                  </code>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>Registry</span>
                  <code className="text-primary">
                    {shortenHex(runtimeConfig.contractAddress || DEFAULT_CONTRACT_ADDRESS)}
                  </code>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>Trusted verifier</span>
                  <code className="text-primary">
                    {shortenHex(runtimeConfig.verifierAddress || DEFAULT_VERIFIER_ADDRESS)}
                  </code>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>RPC</span>
                  <code className="text-primary">
                    {runtimeConfig.rpcUrl.replace(/^https?:\/\//, "")}
                  </code>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <ActionButton
                  disabled={isConnecting}
                  onClick={connectWallet}
                  tone="secondary"
                >
                  {isConnecting
                    ? "Connecting..."
                    : connectedWallet
                      ? "Use connected wallet"
                      : "Connect wallet"}
                </ActionButton>
                <ActionButton
                  disabled={!subjectWallet.trim() || isChecking}
                  onClick={checkVerification}
                >
                  {isChecking ? "Checking chain..." : "Check verification"}
                </ActionButton>
                {connectedWallet ? (
                  <ActionButton onClick={forgetWalletInApp} tone="secondary">
                    Forget wallet in app
                  </ActionButton>
                ) : null}
                <SecondaryButton href="/identity">
                  Return to identity flow
                </SecondaryButton>
              </div>

              {walletError ? (
                <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                  {walletError}
                </div>
              ) : null}
              {isRuntimeConfigLoading ? (
                <div className="rounded-[1.5rem] bg-primary/10 px-4 py-4 text-sm leading-6 text-primary">
                  Loading live chain config.
                </div>
              ) : null}
              {runtimeConfigError ? (
                <div className="rounded-[1.5rem] bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
                  Live OCR config could not be loaded. Using fallback values. {runtimeConfigError}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <Panel className="rounded-[2.25rem]">
            <div className="font-headline text-2xl font-bold">
              2. On-chain verification result
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              The contract returns the latest attestation for this subject wallet. The
              verifier sees whether the claim is valid, who signed it, and whether it
              has expired.
            </p>

            {verificationStatus && subjectVerification ? (
              <>
                <div
                  className={`mt-6 rounded-[1.75rem] px-6 py-6 ${
                    verificationStatus.verified
                      ? "bg-tertiary/10 text-tertiary"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  <div className="font-label text-[10px] uppercase tracking-[0.18em]">
                    Verification result
                  </div>
                  <div className="mt-2 font-headline text-3xl font-bold">
                    {verificationStatus.verified
                      ? "Pass: age over 18 verified"
                      : verificationStatus.isExpired
                        ? "Fail: attestation expired"
                        : verificationStatus.isTrustedVerifier
                          ? "Fail: attestation does not prove over 18"
                          : "Fail: verifier not trusted"}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface">
                    {verificationStatus.verified
                      ? "The connected registry has a live verifier-backed attestation for this wallet. The verifier can rely on the age result without seeing the source identity document."
                      : "This wallet does not currently have a valid live age attestation that satisfies the local verifier rules."}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Status
                    </div>
                    <div
                      className={`mt-2 font-headline text-xl font-bold ${
                        verificationStatus.verified ? "text-tertiary" : "text-danger"
                      }`}
                    >
                      {verificationStatus.verified ? "Verified" : "Failed"}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Claim
                    </div>
                    <div className="mt-2 font-headline text-xl font-bold text-on-surface">
                      {subjectVerification.isOver18 ? "Over 18" : "Under 18"}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Quality
                    </div>
                    <div className="mt-2 font-headline text-xl font-bold text-on-surface">
                      {subjectVerification.quality}%
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                    <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                      Expires
                    </div>
                    <div className="mt-2 font-headline text-lg font-bold text-on-surface">
                      {formatUnixTime(subjectVerification.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] bg-surface-container-low p-5">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Participants
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <VerificationMetaCard
                      label="Subject wallet"
                      mono
                      value={subjectVerification.subject}
                    />
                    <VerificationMetaCard
                      label="Verifier wallet"
                      mono
                      value={subjectVerification.verifier}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] bg-surface-container-low p-5">
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Contract record
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <VerificationMetaCard
                      label="Issued at"
                      value={formatUnixTime(subjectVerification.issuedAt)}
                    />
                    <VerificationMetaCard
                      label="Commitment"
                      mono
                      value={shortenHex(subjectVerification.commitment, 12)}
                    />
                    <VerificationMetaCard
                      label="Digest"
                      mono
                      value={shortenHex(subjectVerification.digest, 12)}
                    />
                    <VerificationMetaCard
                      label="Attestation key"
                      mono
                      value={shortenHex(subjectVerification.attestationKey, 12)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[1.75rem] bg-surface-container-low p-5 text-sm leading-6 text-on-surface-variant">
                Enter a subject wallet and run the verification check. This page now
                reads the contract directly instead of relying on the older local demo
                state.
              </div>
            )}
          </Panel>
        </div>
      </section>
    </PageShell>
  );
}
