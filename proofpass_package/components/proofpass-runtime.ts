"use client";

import { useEffect, useState } from "react";
import {
  ANVIL_CHAIN_ID,
  ANVIL_CHAIN_NAME,
  ANVIL_CURRENCY,
  ANVIL_RPC_URL,
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_VERIFIER_ADDRESS,
} from "./proofpass-contract";

const DEFAULT_OCR_API_BASE_URL =
  process.env.NEXT_PUBLIC_OCR_API_URL ??
  "https://proofpass-ocr-api-production.up.railway.app";

type PublicSettingsResponse = {
  attestationTtlSeconds: number;
  chainId: number;
  chainName: string;
  contractAddress: string;
  explorerBaseUrl: string;
  nativeCurrencyName: string;
  nativeCurrencySymbol: string;
  rpcUrl: string;
  verifierAddress: string;
};

export type ProofPassRuntimeConfig = {
  attestationTtlSeconds: number;
  chainId: number;
  chainIdHex: string;
  chainName: string;
  contractAddress: string;
  explorerBaseUrl: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  ocrApiBaseUrl: string;
  rpcUrl: string;
  verifierAddress: string;
};

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeAddress(value: string) {
  return value.trim();
}

function buildConfig(overrides?: Partial<PublicSettingsResponse>): ProofPassRuntimeConfig {
  const chainId = overrides?.chainId ?? ANVIL_CHAIN_ID;

  return {
    attestationTtlSeconds: overrides?.attestationTtlSeconds ?? 3600,
    chainId,
    chainIdHex: `0x${chainId.toString(16)}`,
    chainName: overrides?.chainName?.trim() || ANVIL_CHAIN_NAME,
    contractAddress:
      normalizeAddress(overrides?.contractAddress ?? "") || DEFAULT_CONTRACT_ADDRESS,
    explorerBaseUrl: normalizeUrl(overrides?.explorerBaseUrl ?? ""),
    nativeCurrency: {
      decimals: 18,
      name: overrides?.nativeCurrencyName?.trim() || ANVIL_CURRENCY.name,
      symbol: overrides?.nativeCurrencySymbol?.trim() || ANVIL_CURRENCY.symbol,
    },
    ocrApiBaseUrl: normalizeUrl(DEFAULT_OCR_API_BASE_URL),
    rpcUrl: normalizeUrl(overrides?.rpcUrl ?? "") || ANVIL_RPC_URL,
    verifierAddress:
      normalizeAddress(overrides?.verifierAddress ?? "") || DEFAULT_VERIFIER_ADDRESS,
  };
}

const fallbackConfig = buildConfig();

export function useProofPassRuntimeConfig() {
  const [config, setConfig] = useState<ProofPassRuntimeConfig>(fallbackConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch(`${fallbackConfig.ocrApiBaseUrl}/settings/public`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Config request failed with ${response.status}.`);
        }

        const payload = (await response.json()) as PublicSettingsResponse;

        if (!cancelled) {
          setConfig(buildConfig(payload));
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setConfig(fallbackConfig);
          setLoadError(
            error instanceof Error ? error.message : "Unable to load runtime config.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, isLoading, loadError };
}
