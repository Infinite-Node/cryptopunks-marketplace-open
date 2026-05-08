"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getAddress,
  isAddress,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  STASH_FACTORY_ADDRESS,
  makeReadClient,
  stashAbi,
  stashFactoryAbi,
} from "../lib/cryptopunks";
import { formatReadError } from "../lib/ui";
import { ConnectButton, useWallet } from "../lib/wallet";

const MAINNET_ID = 1;

const TEMPLATE = `{
  "bid": {
    "order": {
      "numberOfUnits": 1,
      "pricePerUnit": "1000000000000000000",
      "auction": "0x0000000000000000000000000000000000000000"
    },
    "accountNonce": "0",
    "bidNonce": "1",
    "expiration": "1735689600",
    "root": "0x0000000000000000000000000000000000000000000000000000000000000000"
  },
  "punkIndex": "0",
  "signature": "0x",
  "proof": []
}`;

type ParsedArgs = {
  bid: {
    order: {
      numberOfUnits: number;
      pricePerUnit: bigint;
      auction: Address;
    };
    accountNonce: bigint;
    bidNonce: bigint;
    expiration: bigint;
    root: Hex;
  };
  punkIndex: bigint;
  signature: Hex;
  proof: readonly Hex[];
};

function asBigInt(v: unknown, field: string): bigint {
  if (typeof v === "number") {
    if (!Number.isInteger(v) || v < 0)
      throw new Error(`${field}: must be a non-negative integer`);
    return BigInt(v);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!/^\d+$/.test(trimmed))
      throw new Error(`${field}: must be a non-negative integer string`);
    return BigInt(trimmed);
  }
  throw new Error(`${field}: must be a number or numeric string`);
}

function asUintFitting(v: unknown, bits: number, field: string): bigint {
  const n = asBigInt(v, field);
  const max = (BigInt(1) << BigInt(bits)) - BigInt(1);
  if (n > max) throw new Error(`${field}: exceeds uint${bits} max`);
  return n;
}

function asAddress(v: unknown, field: string): Address {
  if (typeof v !== "string" || !isAddress(v))
    throw new Error(`${field}: must be a 0x address`);
  return getAddress(v);
}

function asBytes32(v: unknown, field: string): Hex {
  if (typeof v !== "string" || !isHex(v) || v.length !== 66)
    throw new Error(`${field}: must be a 0x-prefixed 32-byte hex string`);
  return v as Hex;
}

function asHexBytes(v: unknown, field: string): Hex {
  if (typeof v !== "string" || !isHex(v))
    throw new Error(`${field}: must be a 0x-prefixed hex string`);
  if (v.length % 2 !== 0)
    throw new Error(`${field}: hex must have an even number of characters`);
  return v as Hex;
}

function parseInput(text: string): ParsedArgs {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!json || typeof json !== "object")
    throw new Error("input must be a JSON object");
  const root = json as Record<string, unknown>;

  if (!root.bid || typeof root.bid !== "object")
    throw new Error("bid: missing or not an object");
  const bid = root.bid as Record<string, unknown>;

  if (!bid.order || typeof bid.order !== "object")
    throw new Error("bid.order: missing or not an object");
  const order = bid.order as Record<string, unknown>;

  const numberOfUnits = (() => {
    const n = asUintFitting(order.numberOfUnits, 16, "bid.order.numberOfUnits");
    return Number(n);
  })();
  const pricePerUnit = asUintFitting(
    order.pricePerUnit,
    80,
    "bid.order.pricePerUnit",
  );
  const auction = asAddress(order.auction, "bid.order.auction");

  const accountNonce = asBigInt(bid.accountNonce, "bid.accountNonce");
  const bidNonce = asBigInt(bid.bidNonce, "bid.bidNonce");
  const expiration = asBigInt(bid.expiration, "bid.expiration");
  const rootHash = asBytes32(bid.root, "bid.root");

  const punkIndex = asBigInt(root.punkIndex, "punkIndex");
  const signature = asHexBytes(root.signature, "signature");

  if (!Array.isArray(root.proof)) throw new Error("proof: must be an array");
  const proof = root.proof.map(
    (p, i) => asBytes32(p, `proof[${i}]`),
  ) as readonly Hex[];

  return {
    bid: {
      order: { numberOfUnits, pricePerUnit, auction },
      accountNonce,
      bidNonce,
      expiration,
      root: rootHash,
    },
    punkIndex,
    signature,
    proof,
  };
}

function fmtPreview(args: ParsedArgs): string {
  const replacer = (_k: string, v: unknown) =>
    typeof v === "bigint" ? v.toString() : v;
  return JSON.stringify(args, replacer, 2);
}

export function ProcessPunkBidPanel() {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const { configured, account, walletClient, chainId } = useWallet();
  const [stashInput, setStashInput] = useState("");
  const [json, setJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedArgs | null>(null);
  const [pending, setPending] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitted" | "confirmed" | "failed"
  >("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const wrongChain = chainId !== null && chainId !== MAINNET_ID;

  const stashAddress: Address | null = useMemo(() => {
    const raw = stashInput.trim();
    if (!raw || !isAddress(raw)) return null;
    return getAddress(raw);
  }, [stashInput]);

  const parseNow = useCallback(() => {
    setParseError(null);
    setParsed(null);
    try {
      setParsed(parseInput(json));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  }, [json]);

  const fillTemplate = () => {
    setJson(TEMPLATE);
    setParseError(null);
    setParsed(null);
  };

  const useMyStash = useCallback(async () => {
    if (!account) return;
    try {
      const addr = await client.readContract({
        address: STASH_FACTORY_ADDRESS,
        abi: stashFactoryAbi,
        functionName: "stashAddressFor",
        args: [account],
      });
      setStashInput(addr);
    } catch (e) {
      setTxError(e instanceof Error ? e.message.split("\n")[0] : String(e));
    }
  }, [account, client]);

  const submit = async () => {
    if (!walletClient || !account || !stashAddress || !parsed) return;
    setPending(true);
    setTxError(null);
    setHash(null);
    setStatus("idle");
    try {
      const { request } = await client.simulateContract({
        account,
        address: stashAddress,
        abi: stashAbi,
        functionName: "processPunkBid",
        args: [parsed.bid, parsed.punkIndex, parsed.signature, parsed.proof],
      });
      const h = await walletClient.writeContract(request);
      setHash(h);
      setStatus("submitted");
      const receipt = await client.waitForTransactionReceipt({ hash: h });
      setStatus(receipt.status === "success" ? "confirmed" : "failed");
    } catch (err) {
      setTxError(formatReadError(err).message);
      setStatus("idle");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold">{"// "}process a punk bid</h3>

      <p>
        signed punk bids are produced off-chain and submitted onchain by the{" "}
        bid&apos;s target auction (
        <code className="bg-black text-white px-1">order.auction</code>). this
        form helps you shape the call — paste the JSON below and verify the
        decoded fields before sending.
      </p>

      <div className="flex flex-col gap-1">
        <label className="font-bold">stash address</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="0x… stash to call"
            value={stashInput}
            onChange={(e) => setStashInput(e.target.value)}
            className="flex-1 border border-black px-3 py-2 outline-none focus:border-pink"
            spellCheck={false}
            autoComplete="off"
          />
          {account && (
            <button
              type="button"
              onClick={useMyStash}
              className="border border-black px-4 py-2 hover:bg-black hover:text-white"
            >
              use mine
            </button>
          )}
        </div>
        {stashInput.trim() && !stashAddress && (
          <span style={{ color: "var(--offer)" }}>
            <span className="text-pink">■</span> not a valid 0x address
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="font-bold">call payload (JSON)</label>
          <button
            type="button"
            onClick={fillTemplate}
            className="border border-black px-2 py-1 hover:bg-black hover:text-white"
          >
            fill template
          </button>
        </div>
        <textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setParseError(null);
            setParsed(null);
          }}
          rows={14}
          spellCheck={false}
          placeholder="paste a processPunkBid payload — click 'fill template' for the shape"
          className="border border-black px-3 py-2 outline-none focus:border-pink font-mono"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={parseNow}
            disabled={!json.trim()}
            className="bg-pink text-white px-3 py-1.5 hover:bg-black disabled:opacity-50"
          >
            validate
          </button>
        </div>
        {parseError && (
          <p style={{ color: "var(--offer)" }}>
            <span className="text-pink">■</span> {parseError}
          </p>
        )}
      </div>

      {parsed && (
        <div
          className="flex flex-col gap-2 border-l-2 pl-3"
          style={{ borderColor: "var(--bid)" }}
        >
          <span className="font-bold">decoded args</span>
          <pre className="overflow-auto text-xs whitespace-pre-wrap break-all">
            {fmtPreview(parsed)}
          </pre>
        </div>
      )}

      {!account && (
        <div className="border-t border-black pt-3 flex items-center gap-3">
          <span>connect a wallet to submit the call.</span>
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
      )}

      {account && walletClient && (
        <div className="border-t border-black pt-3 flex flex-col gap-2">
          {wrongChain && (
            <p style={{ color: "var(--offer)" }}>
              <span className="text-pink">■</span> switch your wallet to
              ethereum mainnet to send transactions.
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || wrongChain || !stashAddress || !parsed}
            className="self-start px-3 py-1.5 text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--transfer)" }}
          >
            {pending ? "sending…" : "send processPunkBid"}
          </button>
          {txError && <p style={{ color: "var(--offer)" }}>{txError}</p>}
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
      )}
    </div>
  );
}
