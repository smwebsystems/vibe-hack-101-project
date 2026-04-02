"use client";

import type { ProofPassRuntimeConfig } from "./proofpass-runtime";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
};

export type EnsureConfiguredNetworkResult = "already-active" | "switched" | "added";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getInjectedEthereum() {
  const injected = window.ethereum;
  if (!injected) {
    return undefined;
  }

  const multiProviders = injected.providers;
  if (Array.isArray(multiProviders) && multiProviders.length > 0) {
    return multiProviders.find((provider) => provider.isMetaMask) ?? multiProviders[0];
  }

  return injected;
}

type WalletLikeError = {
  code?: number;
  message?: string;
};

export function describeWalletError(error: unknown) {
  const walletError = error as WalletLikeError | undefined;

  if (walletError?.code === 4001) {
    return "Wallet request was rejected.";
  }

  if (walletError?.code === 4902) {
    return "This network is not available in the wallet yet. Use Add Network first.";
  }

  if (walletError?.code === -32002) {
    return "A wallet request is already pending. Open the wallet extension and finish it first.";
  }

  if (walletError?.message) {
    return walletError.message;
  }

  return "Wallet request failed.";
}

export async function addChainToWallet(config: ProofPassRuntimeConfig) {
  const ethereum = getInjectedEthereum();
  if (!ethereum) {
    throw new Error("MetaMask or another browser wallet is required.");
  }

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: config.chainIdHex,
        chainName: config.chainName,
        nativeCurrency: config.nativeCurrency,
        rpcUrls: [config.rpcUrl],
      },
    ],
  });
}

export async function ensureConfiguredNetwork(
  config: ProofPassRuntimeConfig,
): Promise<EnsureConfiguredNetworkResult> {
  const ethereum = getInjectedEthereum();
  if (!ethereum) {
    throw new Error("MetaMask or another browser wallet is required.");
  }

  const chainId = (await ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (chainId === config.chainIdHex) {
    return "already-active";
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
    return "switched";
  } catch (error) {
    const walletError = error as WalletLikeError | undefined;
    if (walletError?.code === 4902) {
      await addChainToWallet(config);
      return "added";
    }

    throw error;
  }
}

export async function requestConnectedWallet() {
  const ethereum = getInjectedEthereum();
  if (!ethereum) {
    throw new Error("MetaMask or another browser wallet is required.");
  }

  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  return accounts[0]?.toLowerCase() ?? "";
}
