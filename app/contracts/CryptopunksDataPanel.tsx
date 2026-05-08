"use client";

import { useMemo, useState } from "react";
import type { PublicClient } from "viem";
import {
  CRYPTOPUNKS_DATA_ADDRESS,
  cryptopunksDataAbi,
  makeReadClient,
} from "../lib/cryptopunks";

type Result = {
  index: number;
  imageSvg: string;
  attributesText: string;
};

export function CryptopunksDataPanel() {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (raw === "") return;
    if (!/^\d+$/.test(raw)) {
      setError("Punk index must be a whole number between 0 and 9999.");
      setResult(null);
      return;
    }
    const index = Number(raw);
    if (index < 0 || index > 9999) {
      setError("Punk index must be between 0 and 9999.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [imageSvg, attributesText] = await Promise.all([
        client.readContract({
          address: CRYPTOPUNKS_DATA_ADDRESS,
          abi: cryptopunksDataAbi,
          functionName: "punkImageSvg",
          args: [index],
        }),
        client.readContract({
          address: CRYPTOPUNKS_DATA_ADDRESS,
          abi: cryptopunksDataAbi,
          functionName: "punkAttributes",
          args: [index],
        }),
      ]);
      setResult({ index, imageSvg, attributesText });
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const svgMarkup = result
    ? result.imageSvg
        .replace(/^data:image\/svg\+xml;utf8,/, "")
        .replace(/<svg /, '<svg width="192" height="192" ')
    : null;

  const attributes = result
    ? result.attributesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="border border-black p-4 flex flex-col gap-4">
      <h3 className="font-bold">{"// "}interact</h3>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="punk index 0–9999"
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
      </form>

      {error && (
        <p style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> {error}
        </p>
      )}
      {loading && <p>reading chain…</p>}

      {result && !loading && svgMarkup && (
        <div
          className="flex flex-col gap-3 border-l-2 pl-3"
          style={{ borderColor: "var(--bid)" }}
        >
          <div className="flex flex-col">
            <span>punk #{result.index}</span>
            <div
              className="self-start"
              style={{ imageRendering: "pixelated" }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span>
              <code className="bg-black text-white px-1">punkAttributes</code>{" "}
              returned
            </span>
            <code className="bg-black text-white px-2 py-1 break-all">
              {result.attributesText}
            </code>
            {attributes.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 list-none pl-0">
                {attributes.map((a, i) => (
                  <li key={`${a}:${i}`}>
                    <span className="text-pink">■</span> {a}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="group">
            <summary className="cursor-pointer select-none hover:text-pink list-none [&::-webkit-details-marker]:hidden">
              <span className="text-pink group-open:hidden">▸</span>
              <span className="text-pink hidden group-open:inline">▾</span>{" "}
              raw <code className="bg-black text-white px-1">punkImageSvg</code>{" "}
              return
            </summary>
            <pre className="mt-2 bg-black text-white p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {result.imageSvg}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
