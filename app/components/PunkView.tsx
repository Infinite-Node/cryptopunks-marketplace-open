"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatEther,
  getAddress,
  isAddress,
  parseEther,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import {
  CRYPTOPUNKS_ADDRESS,
  CRYPTOPUNKS_DATA_ADDRESS,
  cryptopunksAbi,
  cryptopunksDataAbi,
  makeReadClient,
} from "../lib/cryptopunks";
import {
  cacheKeys,
  readImmutable,
  writeImmutable,
} from "../lib/storage";
import {
  ActionCard,
  Field,
  MAINNET_ID,
  RpcError,
  ZERO_ADDRESS,
  eqAddr,
  etherscanAddress,
  etherscanPunk,
  shortenAddress,
} from "../lib/ui";
import { ConnectButton, useWallet } from "../lib/wallet";

type PunkState = {
  owner: Address;
  forSale: {
    isForSale: boolean;
    seller: Address;
    minValue: bigint;
    onlySellTo: Address;
  };
  topBid: {
    hasBid: boolean;
    bidder: Address;
    value: bigint;
  };
  imageSvg: string;
  attributes: string[];
};

export function PunkView({ index }: { index: number }) {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const [state, setState] = useState<PunkState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const lookup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cachedSvg = readImmutable<string>(cacheKeys.punkSvg(index));
      const cachedAttrs = readImmutable<string>(cacheKeys.punkAttrs(index));

      const promises: Promise<unknown>[] = [
        client.readContract({
          address: CRYPTOPUNKS_ADDRESS,
          abi: cryptopunksAbi,
          functionName: "punkIndexToAddress",
          args: [BigInt(index)],
        }),
        client.readContract({
          address: CRYPTOPUNKS_ADDRESS,
          abi: cryptopunksAbi,
          functionName: "punksOfferedForSale",
          args: [BigInt(index)],
        }),
        client.readContract({
          address: CRYPTOPUNKS_ADDRESS,
          abi: cryptopunksAbi,
          functionName: "punkBids",
          args: [BigInt(index)],
        }),
      ];
      if (!cachedSvg) {
        promises.push(
          client.readContract({
            address: CRYPTOPUNKS_DATA_ADDRESS,
            abi: cryptopunksDataAbi,
            functionName: "punkImageSvg",
            args: [index],
          }),
        );
      }
      if (!cachedAttrs) {
        promises.push(
          client.readContract({
            address: CRYPTOPUNKS_DATA_ADDRESS,
            abi: cryptopunksDataAbi,
            functionName: "punkAttributes",
            args: [index],
          }),
        );
      }
      const results = await Promise.all(promises);
      const owner = results[0] as Address;
      const forSale = results[1] as readonly [
        boolean,
        bigint,
        Address,
        bigint,
        Address,
      ];
      const topBid = results[2] as readonly [boolean, bigint, Address, bigint];
      let cursor = 3;
      const imageSvg = cachedSvg ?? (results[cursor++] as string);
      const attributesText = cachedAttrs ?? (results[cursor++] as string);
      if (!cachedSvg) writeImmutable(cacheKeys.punkSvg(index), imageSvg);
      if (!cachedAttrs)
        writeImmutable(cacheKeys.punkAttrs(index), attributesText);

      const [isForSale, , seller, minValue, onlySellTo] = forSale;
      const [hasBid, , bidder, value] = topBid;
      const attributes = attributesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setState({
        owner,
        forSale: { isForSale, seller, minValue, onlySellTo },
        topBid: { hasBid, bidder, value },
        imageSvg,
        attributes,
      });
    } catch (e) {
      setError(e);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [client, index]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch; lookup uses its own loading-state and the latest reference.
    lookup();
  }, [lookup]);

  if (error != null) return <RpcError error={error} />;
  if (loading || !state)
    return <p>reading chain…</p>;

  return (
    <PunkPanel
      client={client}
      punkIndex={index}
      state={state}
      onMutated={lookup}
    />
  );
}

function PunkPanel({
  client,
  punkIndex,
  state,
  onMutated,
}: {
  client: PublicClient;
  punkIndex: number;
  state: PunkState;
  onMutated: () => void;
}) {
  const { account } = useWallet();
  const isOwner = eqAddr(state.owner, account);
  const userIsTopBidder = eqAddr(state.topBid.bidder, account);

  const headType = state.attributes[0];
  const traits = state.attributes.slice(1);
  const svgMarkup = state.imageSvg
    .replace(/^data:image\/svg\+xml;utf8,/, "")
    .replace(/<svg /, '<svg width="192" height="192" ');

  const status: { label: string; bg: string; accent: string } = (() => {
    if (state.owner === ZERO_ADDRESS) {
      return {
        label: "Unassigned",
        bg: "color-mix(in srgb, var(--foreground) 8%, white)",
        accent: "var(--foreground)",
      };
    }
    if (state.forSale.isForSale) {
      return {
        label: "For sale",
        bg: "var(--offer)",
        accent: "var(--offer)",
      };
    }
    if (state.topBid.hasBid) {
      return {
        label: "Has top bid",
        bg: "color-mix(in srgb, var(--bid) 22%, white)",
        accent: "var(--bid)",
      };
    }
    return { label: "Held", bg: "var(--sold)", accent: "var(--sold)" };
  })();

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold">
        <span className="text-pink">■</span> punk #{punkIndex}{" "}
        <a
          href={etherscanPunk(punkIndex)}
          target="_blank"
          rel="noreferrer"
          className="ml-2"
        >
          cryptopunks.app ↗
        </a>
      </h3>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1 shrink-0">
          <div
            aria-label={`Punk #${punkIndex}`}
            role="img"
            style={{ width: 192, height: 192, backgroundColor: status.bg, display: "flex" }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
          <span style={{ color: status.accent }}>
            ■ {status.label.toLowerCase()}
          </span>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {headType && (
            <div className="flex flex-col">
              <span>type</span>
              <Link href={`/attribute/${encodeURIComponent(headType)}`}>
                {headType}
              </Link>
            </div>
          )}
          <div className="flex flex-col">
            <span>attributes</span>
            {traits.length > 0 ? (
              <ul className="flex flex-wrap gap-1 mt-1 list-none pl-0">
                {traits.map((t) => (
                  <li key={t}>
                    <Link
                      href={`/attribute/${encodeURIComponent(t)}`}
                      className="border border-black px-2 py-0.5 inline-block no-underline hover:border-pink hover:text-pink"
                    >
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span>none.</span>
            )}
          </div>
          <p>
            image &amp; attributes loaded from onchain{" "}
            <a
              href={etherscanAddress(CRYPTOPUNKS_DATA_ADDRESS)}
              target="_blank"
              rel="noreferrer"
            >
              CryptopunksData
            </a>
            .
          </p>
        </div>
      </div>

      <Field
        label="owner"
        value={
          state.owner === ZERO_ADDRESS ? (
            "unassigned"
          ) : (
            <>
              <a
                href={`/address/${state.owner}`}
                title={state.owner}
              >
                {shortenAddress(state.owner)}
              </a>
              {isOwner && (
                <span className="ml-2 text-pink">you</span>
              )}
            </>
          )
        }
      />

      <div className="flex flex-col gap-1">
        <span>for sale</span>
        {state.forSale.isForSale ? (
          <div
            className="flex flex-col gap-1 pl-3 border-l-2"
            style={{ borderColor: "var(--offer)" }}
          >
            <span style={{ color: "var(--offer)" }}>
              ■ offered at {formatEther(state.forSale.minValue)} ETH
            </span>
            <span>
              seller:{" "}
              <a
                href={`/address/${state.forSale.seller}`}
                title={state.forSale.seller}
              >
                {shortenAddress(state.forSale.seller)}
              </a>
            </span>
            {state.forSale.onlySellTo !== ZERO_ADDRESS && (
              <span>
                only to:{" "}
                <a
                  href={`/address/${state.forSale.onlySellTo}`}
                  title={state.forSale.onlySellTo}
                >
                  {shortenAddress(state.forSale.onlySellTo)}
                </a>
              </span>
            )}
          </div>
        ) : (
          <span>not currently offered.</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span>top bid</span>
        {state.topBid.hasBid ? (
          <div
            className="flex flex-col gap-1 pl-3 border-l-2"
            style={{ borderColor: "var(--bid)" }}
          >
            <span style={{ color: "var(--bid)" }}>
              ■ {formatEther(state.topBid.value)} ETH
            </span>
            <span>
              bidder:{" "}
              <a
                href={`/address/${state.topBid.bidder}`}
                title={state.topBid.bidder}
              >
                {shortenAddress(state.topBid.bidder)}
              </a>
              {userIsTopBidder && (
                <span className="ml-2 text-pink">you</span>
              )}
            </span>
          </div>
        ) : (
          <span>no active bid.</span>
        )}
      </div>

      <PunkActions
        client={client}
        punkIndex={punkIndex}
        state={state}
        onMutated={onMutated}
      />
    </div>
  );
}

function PunkActions({
  client,
  punkIndex,
  state,
  onMutated,
}: {
  client: PublicClient;
  punkIndex: number;
  state: PunkState;
  onMutated: () => void;
}) {
  const { configured, account, walletClient, chainId } = useWallet();
  const isOwner = !!account && eqAddr(state.owner, account);
  const userIsTopBidder = !!account && eqAddr(state.topBid.bidder, account);
  const wrongChain = chainId !== null && chainId !== MAINNET_ID;

  return (
    <div className="border-t border-black pt-4 flex flex-col gap-4">
      <h4 className="font-bold">
        {"// "}actions
      </h4>

      {!account && <ConnectPrompt configured={configured} />}

      {account && wrongChain && (
        <p style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> switch your wallet to ethereum
          mainnet to send transactions.
        </p>
      )}

      {account &&
        walletClient &&
        (isOwner ? (
          <OwnerActions
            client={client}
            walletClient={walletClient}
            account={account}
            punkIndex={punkIndex}
            state={state}
            disabled={wrongChain}
            onMutated={onMutated}
          />
        ) : (
          <NonOwnerActions
            client={client}
            walletClient={walletClient}
            account={account}
            punkIndex={punkIndex}
            state={state}
            userIsTopBidder={userIsTopBidder}
            disabled={wrongChain}
            onMutated={onMutated}
          />
        ))}
    </div>
  );
}

function ConnectPrompt({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <p>
        <span className="text-pink">■</span> wallet not configured. see{" "}
        <a href="/docs">/docs</a> to set{" "}
        <code className="bg-black text-white px-1">
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        </code>
        .
      </p>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span>
        connect a wallet to buy, bid, transfer, or list this punk.
      </span>
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
    </div>
  );
}

function OwnerActions({
  client,
  walletClient,
  account,
  punkIndex,
  state,
  disabled,
  onMutated,
}: {
  client: PublicClient;
  walletClient: WalletClient;
  account: Address;
  punkIndex: number;
  state: PunkState;
  disabled: boolean;
  onMutated: () => void;
}) {
  const [offerPrice, setOfferPrice] = useState("");
  const [acceptMin, setAcceptMin] = useState("");
  const [transferTo, setTransferTo] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ActionCard
        accent="offer"
        title="offer for sale"
        description="set a minimum sale price in ETH. anyone can buy at or above this price."
        submitLabel="offer"
        disabled={disabled}
        run={async () => {
          const wei = parseEther(offerPrice as `${number}`);
          const { request } = await client.simulateContract({
            account,
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "offerPunkForSale",
            args: [BigInt(punkIndex), wei],
          });
          return walletClient.writeContract(request);
        }}
        validate={() =>
          /^\d+(\.\d+)?$/.test(offerPrice.trim())
            ? null
            : "enter a price in ETH (e.g. 1.5)."
        }
        onDone={onMutated}
        client={client}
      >
        <input
          type="text"
          inputMode="decimal"
          placeholder="min price (ETH)"
          value={offerPrice}
          onChange={(e) => setOfferPrice(e.target.value)}
          className="w-full border border-black px-3 py-2 outline-none focus:border-pink"
        />
      </ActionCard>

      {state.forSale.isForSale && (
        <ActionCard
          accent="offer"
          title="withdraw offer"
          description="remove your current sale offer."
          submitLabel="withdraw"
          disabled={disabled}
          run={async () => {
            const { request } = await client.simulateContract({
              account,
              address: CRYPTOPUNKS_ADDRESS,
              abi: cryptopunksAbi,
              functionName: "punkNoLongerForSale",
              args: [BigInt(punkIndex)],
            });
            return walletClient.writeContract(request);
          }}
          onDone={onMutated}
          client={client}
        />
      )}

      {state.topBid.hasBid && (
        <ActionCard
          accent="bid"
          title="accept top bid"
          description={`sell to ${shortenAddress(state.topBid.bidder)} at ${formatEther(state.topBid.value)} ETH or above.`}
          submitLabel="accept"
          disabled={disabled}
          run={async () => {
            const wei = parseEther(acceptMin as `${number}`);
            const { request } = await client.simulateContract({
              account,
              address: CRYPTOPUNKS_ADDRESS,
              abi: cryptopunksAbi,
              functionName: "acceptBidForPunk",
              args: [BigInt(punkIndex), wei],
            });
            return walletClient.writeContract(request);
          }}
          validate={() =>
            /^\d+(\.\d+)?$/.test(acceptMin.trim())
              ? null
              : "enter a minimum acceptable price in ETH."
          }
          onDone={onMutated}
          client={client}
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder="min acceptable (ETH)"
            value={acceptMin}
            onChange={(e) => setAcceptMin(e.target.value)}
            className="w-full border border-black px-3 py-2 outline-none focus:border-pink"
          />
        </ActionCard>
      )}

      <ActionCard
        accent="transfer"
        title="transfer"
        description="send this punk to another address. no payment exchanged."
        submitLabel="transfer"
        disabled={disabled}
        run={async () => {
          const { request } = await client.simulateContract({
            account,
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "transferPunk",
            args: [getAddress(transferTo.trim()), BigInt(punkIndex)],
          });
          return walletClient.writeContract(request);
        }}
        validate={() =>
          isAddress(transferTo.trim())
            ? null
            : "enter a valid recipient address."
        }
        onDone={onMutated}
        client={client}
      >
        <input
          type="text"
          placeholder="recipient 0x…"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          className="w-full border border-black px-3 py-2 outline-none focus:border-pink"
          spellCheck={false}
          autoComplete="off"
        />
      </ActionCard>
    </div>
  );
}

function NonOwnerActions({
  client,
  walletClient,
  account,
  punkIndex,
  state,
  userIsTopBidder,
  disabled,
  onMutated,
}: {
  client: PublicClient;
  walletClient: WalletClient;
  account: Address;
  punkIndex: number;
  state: PunkState;
  userIsTopBidder: boolean;
  disabled: boolean;
  onMutated: () => void;
}) {
  const [bidValue, setBidValue] = useState("");

  const buyable =
    state.forSale.isForSale &&
    (state.forSale.onlySellTo === ZERO_ADDRESS ||
      eqAddr(state.forSale.onlySellTo, account));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {buyable && (
        <ActionCard
          accent="sold"
          title="buy"
          description={`pay ${formatEther(state.forSale.minValue)} ETH to take ownership.`}
          submitLabel="buy"
          disabled={disabled}
          run={async () => {
            const { request } = await client.simulateContract({
              account,
              address: CRYPTOPUNKS_ADDRESS,
              abi: cryptopunksAbi,
              functionName: "buyPunk",
              args: [BigInt(punkIndex)],
              value: state.forSale.minValue,
            });
            return walletClient.writeContract(request);
          }}
          onDone={onMutated}
          client={client}
        />
      )}

      <ActionCard
        accent="bid"
        title="place bid"
        description={
          state.topBid.hasBid
            ? `current top bid is ${formatEther(state.topBid.value)} ETH. yours must exceed it.`
            : "place a new bid in ETH."
        }
        submitLabel="bid"
        disabled={disabled}
        run={async () => {
          const wei = parseEther(bidValue as `${number}`);
          const { request } = await client.simulateContract({
            account,
            address: CRYPTOPUNKS_ADDRESS,
            abi: cryptopunksAbi,
            functionName: "enterBidForPunk",
            args: [BigInt(punkIndex)],
            value: wei,
          });
          return walletClient.writeContract(request);
        }}
        validate={() =>
          /^\d+(\.\d+)?$/.test(bidValue.trim())
            ? null
            : "enter a bid value in ETH."
        }
        onDone={onMutated}
        client={client}
      >
        <input
          type="text"
          inputMode="decimal"
          placeholder="bid (ETH)"
          value={bidValue}
          onChange={(e) => setBidValue(e.target.value)}
          className="w-full border border-black px-3 py-2 outline-none focus:border-pink"
        />
      </ActionCard>

      {userIsTopBidder && (
        <ActionCard
          accent="bid"
          title="withdraw bid"
          description="cancel your bid and reclaim the locked ETH."
          submitLabel="withdraw bid"
          disabled={disabled}
          run={async () => {
            const { request } = await client.simulateContract({
              account,
              address: CRYPTOPUNKS_ADDRESS,
              abi: cryptopunksAbi,
              functionName: "withdrawBidForPunk",
              args: [BigInt(punkIndex)],
            });
            return walletClient.writeContract(request);
          }}
          onDone={onMutated}
          client={client}
        />
      )}
    </div>
  );
}
