"use client";

import Link from "next/link";
import { useState } from "react";
import { CRYPTOPUNKS_ADDRESS } from "../lib/cryptopunks";
import { etherscanAddress } from "../lib/ui";
import { ConnectButton, useWallet } from "../lib/wallet";

function WalletWidget() {
  const { configured } = useWallet();

  if (!configured) {
    return (
      <span>
        <span className="text-pink">■</span> wallet not configured —{" "}
        <Link href="/docs">setup</Link>
      </span>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        if (!mounted) return null;
        if (!account || !chain) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="bg-pink text-white px-3 py-1.5 hover:bg-black"
            >
              connect wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="px-3 py-1.5 border"
              style={{
                borderColor: "var(--offer)",
                color: "var(--offer)",
              }}
            >
              wrong network
            </button>
          );
        }
        return (
          <button
            onClick={openAccountModal}
            type="button"
            className="hover:opacity-70"
            title={account.address}
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-b border-black px-4 sm:px-6 py-4 sm:py-5">
      <div className="flex items-baseline justify-between gap-x-4 flex-wrap gap-y-3">
        <h1 className="font-bold leading-none">
          <Link href="/" onClick={closeMenu}>
            <span className="text-pink">■</span> cryptopunks open source
          </Link>
        </h1>

        <nav className="hidden sm:flex gap-4">
          <Link href="/">home</Link>
          <Link href="/contracts">contracts</Link>
          <Link href="/docs">docs</Link>
        </nav>

        <div className="hidden sm:flex items-center gap-3 flex-wrap ml-auto">
          <WalletWidget />
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "close menu" : "open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="sm:hidden flex flex-col justify-center items-center gap-[3px] w-8 h-8 border border-black hover:border-pink"
        >
          <span
            className={`block w-4 h-px bg-black transition-transform ${
              menuOpen ? "translate-y-[4px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-4 h-px bg-black transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-4 h-px bg-black transition-transform ${
              menuOpen ? "-translate-y-[4px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden flex flex-col gap-3 mt-4 pt-4 border-t border-black">
          <Link href="/" onClick={closeMenu}>
            home
          </Link>
          <Link href="/contracts" onClick={closeMenu}>
            contracts
          </Link>
          <Link href="/docs" onClick={closeMenu}>
            docs
          </Link>
          <a
            href="https://github.com/Infinite-Node/cryptopunks-marketplace-open"
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            github
          </a>
          <a
            href={etherscanAddress(CRYPTOPUNKS_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            contract
          </a>
        </nav>
      )}
    </header>
  );
}

export function MobileWalletBar() {
  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-black bg-background px-4 py-3 flex items-center justify-center"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <WalletWidget />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-black px-4 sm:px-6 py-4 flex flex-col gap-2">
      <p style={{ color: "var(--offer)" }}>
        <span className="text-pink">■</span> heads up — this is an open source
        example, not the official marketplace. for real trading, use{" "}
        <a href="https://www.cryptopunks.app" target="_blank" rel="noreferrer">
          cryptopunks.app
        </a>
        .
      </p>
      <div className="hidden sm:flex flex-wrap gap-x-6 gap-y-1">
        <Link href="/docs">setup</Link>
        <a
          href="https://github.com/Infinite-Node/cryptopunks-marketplace-open"
          target="_blank"
          rel="noreferrer"
        >
          github
        </a>
        <a
          href={etherscanAddress(CRYPTOPUNKS_ADDRESS)}
          target="_blank"
          rel="noreferrer"
        >
          contract
        </a>
      </div>
    </footer>
  );
}
