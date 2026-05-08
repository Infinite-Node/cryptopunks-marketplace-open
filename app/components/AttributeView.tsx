"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PublicClient } from "viem";
import {
  CRYPTOPUNKS_DATA_ADDRESS,
  cryptopunksDataAbi,
  makeReadClient,
} from "../lib/cryptopunks";
import {
  cacheKeys,
  readImmutable,
  writeImmutable,
} from "../lib/storage";
import { RpcError } from "../lib/ui";

type Match = { index: number; svg: string };

export function AttributeView({ trait }: { trait: string }) {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const traitNorm = trait.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch; cancellation flag handles unmount.
    setScanning(true);
    setError(null);
    setMatches(null);
    (async () => {
      try {
        let allAttrs = readImmutable<string[]>(cacheKeys.allAttrs());
        if (!allAttrs || allAttrs.length !== 10000) {
          const attrCalls = Array.from({ length: 10000 }, (_, i) => ({
            address: CRYPTOPUNKS_DATA_ADDRESS,
            abi: cryptopunksDataAbi,
            functionName: "punkAttributes" as const,
            args: [i] as const,
          }));
          const results = await client.multicall({ contracts: attrCalls });
          if (cancelled) return;
          const fetched = new Array<string>(10000);
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            fetched[i] = r.status === "success" ? (r.result as string) : "";
          }
          allAttrs = fetched;
          writeImmutable(cacheKeys.allAttrs(), fetched);
          for (let i = 0; i < fetched.length; i++) {
            if (fetched[i]) {
              writeImmutable(cacheKeys.punkAttrs(i), fetched[i]);
            }
          }
        }

        const matched: number[] = [];
        for (let i = 0; i < allAttrs.length; i++) {
          const s = allAttrs[i];
          if (!s) continue;
          const parts = s.split(",").map((p) => p.trim().toLowerCase());
          if (parts.includes(traitNorm)) matched.push(i);
        }

        if (matched.length === 0) {
          setMatches([]);
          return;
        }

        const cached: Match[] = [];
        const missing: number[] = [];
        for (const i of matched) {
          const svg = readImmutable<string>(cacheKeys.punkSvg(i));
          if (svg) cached.push({ index: i, svg });
          else missing.push(i);
        }

        if (missing.length === 0) {
          setMatches(cached);
          return;
        }

        if (cached.length > 0) setMatches([...cached]);

        const svgCalls = missing.map((i) => ({
          address: CRYPTOPUNKS_DATA_ADDRESS,
          abi: cryptopunksDataAbi,
          functionName: "punkImageSvg" as const,
          args: [i] as const,
        }));
        const svgs = await client.multicall({ contracts: svgCalls });
        if (cancelled) return;
        const fetched: Match[] = [];
        for (let i = 0; i < missing.length; i++) {
          const r = svgs[i];
          if (r.status !== "success") continue;
          const svg = r.result as string;
          writeImmutable(cacheKeys.punkSvg(missing[i]), svg);
          fetched.push({ index: missing[i], svg });
        }
        const all = [...cached, ...fetched].sort((a, b) => a.index - b.index);
        setMatches(all);
      } catch (e) {
        if (cancelled) return;
        setError(e);
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, traitNorm]);

  if (error != null) return <RpcError error={error} />;

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold">
        <span className="text-pink">■</span> attribute:{" "}
        <span className="text-pink">{trait.toLowerCase()}</span>
        {matches && (
          <span>
            {" "}
            ({matches.length} {matches.length === 1 ? "punk" : "punks"})
          </span>
        )}
      </h3>

      {scanning && <p>scanning all 10,000 punks…</p>}

      {matches && matches.length === 0 && !scanning && (
        <p>no punks have this attribute.</p>
      )}

      {matches && matches.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 list-none pl-0">
          {matches.map((m) => (
            <li key={m.index}>
              <Link
                href={`/punk/${m.index}`}
                title={`Punk #${m.index}`}
                className="block border border-black hover:border-pink no-underline"
              >
                <div
                  role="img"
                  aria-label={`Punk #${m.index}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    backgroundColor: "var(--sold)",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: m.svg
                      .replace(/^data:image\/svg\+xml;utf8,/, "")
                      .replace(
                        /<svg /,
                        '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ',
                      ),
                  }}
                />
                <span className="block px-1 py-0.5 border-t border-black text-foreground">
                  #{m.index}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
