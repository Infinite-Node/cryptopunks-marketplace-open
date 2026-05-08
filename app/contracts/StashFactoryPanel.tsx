"use client";

import { useCallback, useMemo, useState } from "react";
import {
  formatEther,
  getAddress,
  isAddress,
  type Address,
  type PublicClient,
} from "viem";
import { normalize } from "viem/ens";
import {
  STASH_FACTORY_ADDRESS,
  makeReadClient,
  stashFactoryAbi,
} from "../lib/cryptopunks";
import { formatReadError } from "../lib/ui";
import { ConnectButton, useWallet } from "../lib/wallet";

const MAINNET_ID = 1;

type LookupResult = {
  ownerInput: Address;
  ownerLabel: string;
  stashAddress: Address;
  hasDeployed: boolean;
  balance: bigint;
};

function shortenAddress(addr: string) {
  return addr.length < 10 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function StashFactoryPanel() {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const { configured, account, walletClient, chainId } = useWallet();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFor = useCallback(
    async (owner: Address, label: string) => {
      setLoading(true);
      setError(null);
      try {
        const [stashAddress, hasDeployed] = await Promise.all([
          client.readContract({
            address: STASH_FACTORY_ADDRESS,
            abi: stashFactoryAbi,
            functionName: "stashAddressFor",
            args: [owner],
          }),
          client.readContract({
            address: STASH_FACTORY_ADDRESS,
            abi: stashFactoryAbi,
            functionName: "ownerHasDeployed",
            args: [owner],
          }),
        ]);
        const balance = hasDeployed
          ? await client.getBalance({ address: stashAddress })
          : BigInt(0);
        setResult({
          ownerInput: owner,
          ownerLabel: label,
          stashAddress,
          hasDeployed,
          balance,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message.split("\n")[0] : String(e));
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    if (isAddress(raw)) {
      const addr = getAddress(raw);
      fetchFor(addr, addr);
      return;
    }
    if (!raw.includes(".")) {
      setError("Enter a 0x address or an ENS name.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ensName = normalize(raw);
      const addr = await client.getEnsAddress({ name: ensName });
      if (!addr) {
        setError(`No address found for ${ensName}.`);
        setLoading(false);
        return;
      }
      fetchFor(addr, ensName);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : String(err));
      setLoading(false);
    }
  };

  const useMine = () => {
    if (!account) return;
    setInput(account);
    fetchFor(account, account);
  };

  const refresh = () => {
    if (result) fetchFor(result.ownerInput, result.ownerLabel);
  };

  const isOwnLookup = !!account && !!result && result.ownerInput === account;
  const wrongChain = chainId !== null && chainId !== MAINNET_ID;

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold">
        {"// "}interact
      </h3>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="owner 0x… or name.eth"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-black px-3 py-2 outline-none focus:border-pink"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-pink text-white px-4 py-2 hover:bg-black"
        >
          look up
        </button>
        {account && (
          <button
            type="button"
            onClick={useMine}
            className="border border-black px-4 py-2 hover:bg-black hover:text-white"
          >
            use mine
          </button>
        )}
      </form>

      {error && (
        <p style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> {error}
        </p>
      )}
      {loading && <p>reading chain…</p>}

      {result && !loading && (
        <div className="flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: "var(--bid)" }}>
          <div className="flex flex-col">
            <span>owner</span>
            <a
              href={`https://etherscan.io/address/${result.ownerInput}`}
              target="_blank"
              rel="noreferrer"
              className="break-all"
              title={result.ownerInput}
            >
              {result.ownerLabel === result.ownerInput
                ? shortenAddress(result.ownerInput)
                : `${result.ownerLabel} (${shortenAddress(result.ownerInput)})`}
            </a>
          </div>
          <div className="flex flex-col">
            <span>stash address</span>
            <a
              href={`https://etherscan.io/address/${result.stashAddress}`}
              target="_blank"
              rel="noreferrer"
              className="break-all"
              title={result.stashAddress}
            >
              {result.stashAddress}
            </a>
          </div>
          <div className="flex flex-col">
            <span>deployed</span>
            <span style={{ color: result.hasDeployed ? "var(--transfer)" : "var(--offer)" }}>
              ■ {result.hasDeployed ? "yes" : "not yet"}
            </span>
          </div>
          {result.hasDeployed && (
            <div className="flex flex-col">
              <span>ETH balance</span>
              <span>{formatEther(result.balance)} ETH</span>
            </div>
          )}
        </div>
      )}

      <DeployMine
        configured={configured}
        account={account}
        walletClient={walletClient}
        client={client}
        wrongChain={wrongChain}
        myStashKnown={
          isOwnLookup && result
            ? { hasDeployed: result.hasDeployed, stashAddress: result.stashAddress }
            : null
        }
        onDeployed={refresh}
      />
    </div>
  );
}

function DeployMine({
  configured,
  account,
  walletClient,
  client,
  wrongChain,
  myStashKnown,
  onDeployed,
}: {
  configured: boolean;
  account: Address | null;
  walletClient: import("viem").WalletClient | null;
  client: PublicClient;
  wrongChain: boolean;
  myStashKnown: { hasDeployed: boolean; stashAddress: Address } | null;
  onDeployed: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [status, setStatus] = useState<"idle" | "submitted" | "confirmed" | "failed">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (!account) {
    return (
      <div className="border-t border-black pt-3 flex items-center gap-3">
        <span>
          connect a wallet to deploy your own stash.
        </span>
        {configured && (
          <ConnectButton.Custom>
            {({ openConnectModal, mounted }) =>
              mounted ? (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="bg-pink text-white px-3 py-1.5 hover:bg-black"
                >
                  connect wallet
                </button>
              ) : null
            }
          </ConnectButton.Custom>
        )}
      </div>
    );
  }

  if (!walletClient) return null;

  if (myStashKnown?.hasDeployed) {
    return (
      <div className="border-t border-black pt-3 flex flex-col gap-1">
        <span style={{ color: "var(--transfer)" }}>
          ■ your stash is already deployed.
        </span>
        <a
          href={`https://etherscan.io/address/${myStashKnown.stashAddress}`}
          target="_blank"
          rel="noreferrer"
          className="break-all"
        >
          {myStashKnown.stashAddress}
        </a>
      </div>
    );
  }

  const deploy = async () => {
    setError(null);
    setPending(true);
    setHash(null);
    setStatus("idle");
    try {
      const { request } = await client.simulateContract({
        account,
        address: STASH_FACTORY_ADDRESS,
        abi: stashFactoryAbi,
        functionName: "deployStash",
        args: [account],
      });
      const h = await walletClient.writeContract(request);
      setHash(h);
      setStatus("submitted");
      const receipt = await client.waitForTransactionReceipt({ hash: h });
      setStatus(receipt.status === "success" ? "confirmed" : "failed");
      if (receipt.status === "success") onDeployed();
    } catch (err) {
      setError(formatReadError(err).message);
      setStatus("idle");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border-t border-black pt-3 flex flex-col gap-2">
      <h4 className="font-bold">
        {"// "}deploy your stash
      </h4>
      <p>
        calls{" "}
        <code className="bg-black text-white px-1">deployStash</code> with your
        connected address as the owner. the factory deploys a deterministic
        stash whose address you can preview above with <em>use mine</em> before
        deploying.
      </p>
      {wrongChain && (
        <p style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> switch your wallet to ethereum
          mainnet to send transactions.
        </p>
      )}
      <button
        type="button"
        onClick={deploy}
        disabled={pending || wrongChain}
        className="self-start px-3 py-1.5 text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--transfer)" }}
      >
        {pending ? "sending…" : "deploy"}
      </button>
      {error && (
        <p style={{ color: "var(--offer)" }}>
          {error}
        </p>
      )}
      {hash && (
        <p>
          {status === "submitted" && "submitted: "}
          {status === "confirmed" && "confirmed: "}
          {status === "failed" && "reverted: "}
          <a
            href={`https://etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            {hash.slice(0, 10)}…{hash.slice(-6)}
          </a>
        </p>
      )}
    </div>
  );
}

