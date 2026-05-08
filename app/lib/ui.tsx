"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicClient } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MAINNET_ID = 1;

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function etherscanAddress(addr: string): string {
  return `https://etherscan.io/address/${addr}`;
}

export function etherscanTx(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}

export function etherscanPunk(idx: number | string): string {
  return `https://www.cryptopunks.app/cryptopunks/details/${idx}`;
}

export function eqAddr(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function formatReadError(err: unknown): {
  message: string;
  setupHint: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  if (/RPC_URL is not configured/i.test(raw)) {
    return {
      message: "RPC endpoint is not configured on the server.",
      setupHint: true,
    };
  }
  if (
    err &&
    typeof err === "object" &&
    "shortMessage" in err &&
    typeof (err as { shortMessage?: unknown }).shortMessage === "string"
  ) {
    return {
      message: (err as { shortMessage: string }).shortMessage,
      setupHint: false,
    };
  }
  return { message: raw.split("\n")[0], setupHint: false };
}

export function RpcError({ error }: { error: unknown }) {
  const { message, setupHint } = formatReadError(error);
  return (
    <div className="mt-3" style={{ color: "var(--offer)" }}>
      <p>
        <span className="text-pink">■</span> {message}
      </p>
      {setupHint && (
        <p className="mt-1">
          see <Link href="/docs">/docs</Link> for setup instructions.
        </p>
      )}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">
        {"// "}
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  wrap,
  className,
}: {
  label: string;
  value: React.ReactNode;
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd className={wrap ? "break-all" : ""}>{value}</dd>
    </div>
  );
}

export type ActionAccent = "offer" | "bid" | "sold" | "transfer";

export function ActionCard({
  title,
  description,
  submitLabel,
  accent,
  children,
  run,
  validate,
  disabled,
  onDone,
  client,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  accent: ActionAccent;
  children?: React.ReactNode;
  run: () => Promise<`0x${string}`>;
  validate?: () => string | null;
  disabled?: boolean;
  onDone?: () => void;
  client: PublicClient;
}) {
  const [pending, setPending] = useState(false);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitted" | "confirmed" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const accentVar = `var(--${accent})`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (validate) {
      const v = validate();
      if (v) {
        setError(v);
        return;
      }
    }
    setPending(true);
    setHash(null);
    setStatus("idle");
    try {
      const h = await run();
      setHash(h);
      setStatus("submitted");
      const receipt = await client.waitForTransactionReceipt({ hash: h });
      setStatus(receipt.status === "success" ? "confirmed" : "failed");
      if (receipt.status === "success") onDone?.();
    } catch (err) {
      setError(formatReadError(err).message);
      setStatus("idle");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border-l-2 pl-3 flex flex-col gap-2"
      style={{ borderColor: accentVar }}
    >
      <h5 className="font-bold" style={{ color: accentVar }}>
        ■ {title}
      </h5>
      {description && <p>{description}</p>}
      {children}
      <button
        type="submit"
        disabled={disabled || pending}
        className="self-start px-3 py-1.5 text-white disabled:opacity-50"
        style={{ backgroundColor: accentVar }}
      >
        {pending ? "sending…" : submitLabel}
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
          <a href={etherscanTx(hash)} target="_blank" rel="noreferrer">
            {hash.slice(0, 10)}…{hash.slice(-6)}
          </a>
        </p>
      )}
    </form>
  );
}
