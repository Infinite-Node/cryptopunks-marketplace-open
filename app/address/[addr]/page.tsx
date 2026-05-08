"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, type PublicClient } from "viem";
import { normalize } from "viem/ens";
import { Footer, Header } from "../../components/SiteChrome";
import { AddressView } from "../../components/AddressView";
import { makeReadClient } from "../../lib/cryptopunks";

export default function AddressPage({
  params,
}: {
  params: Promise<{ addr: string }>;
}) {
  const { addr } = use(params);
  const router = useRouter();
  const client = useMemo<PublicClient>(() => makeReadClient(), []);

  const isHex = isAddress(addr);
  const looksLikeEns = !isHex && addr.includes(".");
  const [ensError, setEnsError] = useState<string | null>(null);

  useEffect(() => {
    if (!looksLikeEns) return;
    let cancelled = false;
    setEnsError(null);
    (async () => {
      try {
        const name = normalize(addr);
        const resolved = await client.getEnsAddress({ name });
        if (cancelled) return;
        if (!resolved) {
          setEnsError(`No address found for ${name}.`);
          return;
        }
        router.replace(`/address/${getAddress(resolved)}`);
      } catch (e) {
        if (cancelled) return;
        setEnsError(
          e instanceof Error ? e.message.split("\n")[0] : String(e),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, router, addr, looksLikeEns]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-5xl w-full flex flex-col gap-4">
        <div>
          <Link href="/">← search</Link>
        </div>
        {isHex ? (
          <AddressView addr={getAddress(addr)} />
        ) : looksLikeEns ? (
          ensError ? (
            <div className="border border-black p-4">
              <p style={{ color: "var(--offer)" }}>
                <span className="text-pink">■</span> {ensError}
              </p>
            </div>
          ) : (
            <p>resolving {addr}…</p>
          )
        ) : (
          <div className="border border-black p-4">
            <p style={{ color: "var(--offer)" }}>
              <span className="text-pink">■</span> invalid address{" "}
              <code className="bg-black text-white px-1 break-all">{addr}</code>
              . provide a 20-byte hex address (0x… 40 chars) or an ENS name.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
