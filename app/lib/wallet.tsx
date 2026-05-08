"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  ConnectButton,
  RainbowKitProvider,
  getDefaultConfig,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import type { Address, WalletClient } from "viem";
import { mainnet } from "viem/chains";
import { WagmiProvider, useAccount, useWalletClient } from "wagmi";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const wagmiConfig = PROJECT_ID
  ? getDefaultConfig({
      appName: "CryptoPunks Onchain",
      projectId: PROJECT_ID,
      chains: [mainnet],
      ssr: true,
    })
  : null;

const queryClient = new QueryClient();

type WalletState = {
  configured: boolean;
  account: Address | null;
  chainId: number | null;
  walletClient: WalletClient | null;
};

const DISABLED_STATE: WalletState = {
  configured: false,
  account: null,
  chainId: null,
  walletClient: null,
};

const WalletContext = createContext<WalletState>(DISABLED_STATE);

export function WalletProvider({ children }: { children: ReactNode }) {
  if (!wagmiConfig) {
    return (
      <WalletContext.Provider value={DISABLED_STATE}>
        {children}
      </WalletContext.Provider>
    );
  }
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#EA34B0",
            borderRadius: "none",
            fontStack: "system",
          })}
        >
          <WalletStateProvider>{children}</WalletStateProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function WalletStateProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const { data: walletClient } = useWalletClient();

  const value: WalletState = {
    configured: true,
    account: account.address ?? null,
    chainId: account.chainId ?? null,
    walletClient: walletClient ?? null,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  return useContext(WalletContext);
}

export { ConnectButton };
