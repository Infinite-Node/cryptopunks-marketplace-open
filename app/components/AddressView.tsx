"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatEther,
  type Address,
  type PublicClient,
} from "viem";
import {
  CRYPTOPUNKS_ADDRESS,
  CRYPTOPUNKS_DATA_ADDRESS,
  STASH_FACTORY_ADDRESS,
  cryptopunksAbi,
  cryptopunksDataAbi,
  makeReadClient,
  stashFactoryAbi,
} from "../lib/cryptopunks";
import {
  cacheKeys,
  readImmutable,
  readWithTtl,
  writeImmutable,
  writeWithTtl,
} from "../lib/storage";
import {
  ActionCard,
  Field,
  MAINNET_ID,
  RpcError,
  eqAddr,
  etherscanAddress,
} from "../lib/ui";
import { useWallet } from "../lib/wallet";

const HOLDINGS_TTL_MS = 60 * 1000;

type AddressState = {
  balance: bigint;
  pending: bigint;
  reverseEns: string | null;
  stash: {
    address: Address;
    deployed: boolean;
    balance: bigint;
  };
};

type Holding = {
  index: number;
  svg: string;
  forSale: boolean;
  hasBid: boolean;
};

function holdingBg(h: Holding): string {
  if (h.forSale) return "var(--offer)";
  if (h.hasBid) return "color-mix(in srgb, var(--bid) 22%, white)";
  return "var(--sold)";
}

export function AddressView({ addr }: { addr: Address }) {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const { account, walletClient, chainId } = useWallet();
  const [state, setState] = useState<AddressState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);

  const lookup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balance, pending, reverseEns, stashAddress, hasDeployed] =
        await Promise.all([
          client.readContract({
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "balanceOf",
            args: [addr],
          }),
          client.readContract({
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "pendingWithdrawals",
            args: [addr],
          }),
          client.getEnsName({ address: addr }).catch(() => null),
          client.readContract({
            address: STASH_FACTORY_ADDRESS,
            abi: stashFactoryAbi,
            functionName: "stashAddressFor",
            args: [addr],
          }),
          client.readContract({
            address: STASH_FACTORY_ADDRESS,
            abi: stashFactoryAbi,
            functionName: "ownerHasDeployed",
            args: [addr],
          }),
        ]);
      const stashBalance = hasDeployed
        ? await client.getBalance({ address: stashAddress })
        : BigInt(0);
      setState({
        balance,
        pending,
        reverseEns,
        stash: {
          address: stashAddress,
          deployed: hasDeployed,
          balance: stashBalance,
        },
      });
    } catch (e) {
      setError(e);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [client, addr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch; lookup uses its own loading-state and the latest reference.
    lookup();
  }, [lookup]);

  useEffect(() => {
    if (!state) return;
    if (state.balance === BigInt(0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from `state`; we must clear holdings when balance is zero.
      setHoldings([]);
      return;
    }
    let cancelled = false;
    setHoldingsError(null);

    const cachedOwned = readWithTtl<number[]>(
      cacheKeys.ownership(addr),
      HOLDINGS_TTL_MS,
    );

    (async () => {
      try {
        let owned: number[];
        if (cachedOwned) {
          owned = cachedOwned;
        } else {
          setHoldingsLoading(true);
          const ownerLower = addr.toLowerCase();
          const ownershipCalls = Array.from({ length: 10000 }, (_, i) => ({
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "punkIndexToAddress" as const,
            args: [BigInt(i)] as const,
          }));
          const ownership = await client.multicall({
            contracts: ownershipCalls,
          });
          if (cancelled) return;
          owned = [];
          for (let i = 0; i < ownership.length; i++) {
            const r = ownership[i];
            if (
              r.status === "success" &&
              (r.result as string).toLowerCase() === ownerLower
            ) {
              owned.push(i);
            }
          }
          writeWithTtl(cacheKeys.ownership(addr), owned);
        }

        if (owned.length === 0) {
          setHoldings([]);
          setHoldingsLoading(false);
          return;
        }

        const svgFromCache = new Map<number, string>();
        const missingSvg: number[] = [];
        for (const i of owned) {
          const s = readImmutable<string>(cacheKeys.punkSvg(i));
          if (s) svgFromCache.set(i, s);
          else missingSvg.push(i);
        }

        const svgCalls = missingSvg.map((i) => ({
          address: CRYPTOPUNKS_DATA_ADDRESS,
          abi: cryptopunksDataAbi,
          functionName: "punkImageSvg" as const,
          args: [i] as const,
        }));
        const saleCalls = owned.map((i) => ({
          address: CRYPTOPUNKS_ADDRESS,
          abi: cryptopunksAbi,
          functionName: "punksOfferedForSale" as const,
          args: [BigInt(i)] as const,
        }));
        const bidCalls = owned.map((i) => ({
          address: CRYPTOPUNKS_ADDRESS,
          abi: cryptopunksAbi,
          functionName: "punkBids" as const,
          args: [BigInt(i)] as const,
        }));
        const [svgsResult, sales, bids] = await Promise.all([
          svgCalls.length > 0
            ? client.multicall({ contracts: svgCalls })
            : Promise.resolve([] as unknown[]),
          client.multicall({ contracts: saleCalls }),
          client.multicall({ contracts: bidCalls }),
        ]);
        if (cancelled) return;
        const svgsArr = svgsResult as ReadonlyArray<{
          status: "success" | "failure";
          result?: unknown;
        }>;
        for (let i = 0; i < missingSvg.length; i++) {
          const r = svgsArr[i];
          if (r.status === "success") {
            const s = r.result as string;
            svgFromCache.set(missingSvg[i], s);
            writeImmutable(cacheKeys.punkSvg(missingSvg[i]), s);
          }
        }

        const result: Holding[] = [];
        for (let i = 0; i < owned.length; i++) {
          const svg = svgFromCache.get(owned[i]);
          if (!svg) continue;
          const saleR = sales[i];
          const bidR = bids[i];
          const forSale =
            saleR.status === "success"
              ? Boolean(
                  (
                    saleR.result as readonly [
                      boolean,
                      bigint,
                      string,
                      bigint,
                      string,
                    ]
                  )[0],
                )
              : false;
          const hasBid =
            bidR.status === "success"
              ? Boolean(
                  (bidR.result as readonly [boolean, bigint, string, bigint])[0],
                )
              : false;
          result.push({ index: owned[i], svg, forSale, hasBid });
        }
        setHoldings(result);
      } catch (e) {
        if (cancelled) return;
        setHoldingsError(
          e instanceof Error ? e.message.split("\n")[0] : String(e),
        );
      } finally {
        if (!cancelled) setHoldingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, addr, state]);

  const isYou = !!account && eqAddr(addr, account);
  const wrongChain = chainId !== null && chainId !== MAINNET_ID;

  if (error != null) return <RpcError error={error} />;
  if (loading || !state)
    return <p>reading chain…</p>;

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold break-all flex flex-col gap-1">
        {state.reverseEns && (
          <span className="text-pink">■ {state.reverseEns}</span>
        )}
        <span>
          <a href={etherscanAddress(addr)} target="_blank" rel="noreferrer">
            {addr}
          </a>
          {isYou && (
            <span className="ml-2 text-pink">you</span>
          )}
        </span>
      </h3>

      <Field label="punks held" value={state.balance.toString()} />
      <Field
        label="pending withdrawals"
        value={`${formatEther(state.pending)} ETH`}
      />

      {state.balance > BigInt(0) && (
        <div className="pt-2 border-t border-black flex flex-col gap-3">
          <h4 className="font-bold">
            {"// "}holdings
          </h4>
          {holdingsLoading && (
            <p>
              scanning all 10,000 punks for ownership…
            </p>
          )}
          {holdingsError && (
            <p style={{ color: "var(--offer)" }}>
              <span className="text-pink">■</span> {holdingsError}
            </p>
          )}
          {holdings && holdings.length > 0 && (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 list-none pl-0">
              {holdings.map((h) => (
                <li key={h.index}>
                  <Link
                    href={`/punk/${h.index}`}
                    title={`Punk #${h.index}`}
                    className="block border border-black hover:border-pink no-underline"
                  >
                    <div
                      role="img"
                      aria-label={`Punk #${h.index}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        backgroundColor: holdingBg(h),
                      }}
                      dangerouslySetInnerHTML={{
                        __html: h.svg
                          .replace(/^data:image\/svg\+xml;utf8,/, "")
                          .replace(
                            /<svg /,
                            '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ',
                          ),
                      }}
                    />
                    <span className="block px-1 py-0.5 border-t border-black text-foreground">
                      #{h.index}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isYou && walletClient && state.pending > BigInt(0) && (
        <div className="pt-2 border-t border-black">
          <ActionCard
            accent="transfer"
            title="withdraw pending"
            description={`claim ${formatEther(state.pending)} ETH to your wallet.`}
            submitLabel="withdraw"
            disabled={wrongChain}
            run={async () => {
              const { request } = await client.simulateContract({
                account: addr,
                address: CRYPTOPUNKS_ADDRESS,
                abi: cryptopunksAbi,
                functionName: "withdraw",
                args: [],
              });
              return walletClient.writeContract(request);
            }}
            onDone={lookup}
            client={client}
          />
        </div>
      )}

      <div className="pt-2 border-t border-black flex flex-col gap-3">
        <h4 className="font-bold">
          {"// "}stash
        </h4>
        <Field
          label="stash address"
          wrap
          value={
            <a
              href={etherscanAddress(state.stash.address)}
              target="_blank"
              rel="noreferrer"
            >
              {state.stash.address}
            </a>
          }
        />
        <Field
          label="deployed"
          value={
            <span
              style={{
                color: state.stash.deployed
                  ? "var(--transfer)"
                  : "var(--offer)",
              }}
            >
              ■ {state.stash.deployed ? "yes" : "not yet"}
            </span>
          }
        />
        {state.stash.deployed && (
          <Field
            label="stash ETH balance"
            value={`${formatEther(state.stash.balance)} ETH`}
          />
        )}
        {isYou && walletClient && !state.stash.deployed && (
          <ActionCard
            accent="transfer"
            title="deploy your stash"
            description="calls deployStash with your connected address as the owner."
            submitLabel="deploy"
            disabled={wrongChain}
            run={async () => {
              const { request } = await client.simulateContract({
                account: addr,
                address: STASH_FACTORY_ADDRESS,
                abi: stashFactoryAbi,
                functionName: "deployStash",
                args: [addr],
              });
              return walletClient.writeContract(request);
            }}
            onDone={lookup}
            client={client}
          />
        )}
      </div>
    </div>
  );
}
