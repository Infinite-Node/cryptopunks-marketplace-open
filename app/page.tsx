"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getAddress,
  isAddress,
  type PublicClient,
} from "viem";
import { normalize } from "viem/ens";
import { makeReadClient } from "./lib/cryptopunks";
import { Section } from "./lib/ui";
import { Footer, Header } from "./components/SiteChrome";
import { useWallet } from "./lib/wallet";

export default function Home() {
  const client = useMemo<PublicClient>(() => makeReadClient(), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-5xl w-full flex flex-col gap-10">
        <Intro />
        <PunkSearch />
        <AddressSearch client={client} />
      </main>
      <Footer />
    </div>
  );
}

function Intro() {
  return (
    <section className="flex flex-col gap-2 max-w-3xl">
      <p>
        <span className="text-pink">■</span> an open source reference
        marketplace for{" "}
        <a
          href="https://www.cryptopunks.app"
          target="_blank"
          rel="noreferrer"
        >
          cryptopunks
        </a>
        . look up any punk or address, read onchain state straight from the
        original contracts, and place or accept bids and offers from your own
        wallet. nothing here is custodial — every write goes through your
        wallet against the canonical contracts.
      </p>
      <p>
        the source is on{" "}
        <a
          href="https://github.com/Infinite-Node/cryptopunks-marketplace-open"
          target="_blank"
          rel="noreferrer"
        >
          github
        </a>{" "}
        — fork it, run it locally, or wire it to your own RPC.
      </p>
    </section>
  );
}

function PunkSearch() {
  const router = useRouter();
  const [indexInput, setIndexInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(indexInput.trim());
    if (!Number.isInteger(n) || n < 0 || n > 9999) {
      setError("Punk index must be an integer between 0 and 9999.");
      return;
    }
    setError(null);
    router.push(`/punk/${n}`);
  };

  return (
    <Section title="look up a punk">
      <form
        onSubmit={submit}
        className="flex flex-col sm:flex-row gap-2 max-w-lg"
      >
        <input
          type="number"
          min={0}
          max={9999}
          step={1}
          placeholder="punk index (0–9999)"
          value={indexInput}
          onChange={(e) => setIndexInput(e.target.value)}
          className="flex-1 border border-black px-3 py-2 outline-none focus:border-pink"
        />
        <button
          type="submit"
          className="bg-pink text-white px-4 py-2 hover:bg-black"
        >
          look up
        </button>
      </form>
      {error && (
        <p className="mt-3" style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> {error}
        </p>
      )}
    </Section>
  );
}

function AddressSearch({ client }: { client: PublicClient }) {
  const router = useRouter();
  const { account } = useWallet();
  const [addrInput, setAddrInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (addr: string) => {
    router.push(`/address/${getAddress(addr)}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = addrInput.trim();
    if (!raw) return;
    setError(null);

    if (isAddress(raw)) {
      goTo(raw);
      return;
    }
    if (!raw.includes(".")) {
      setError("Enter a 0x address or an ENS name.");
      return;
    }

    setResolving(true);
    try {
      const ensName = normalize(raw);
      const resolved = await client.getEnsAddress({ name: ensName });
      if (!resolved) {
        setError(`No address found for ${ensName}.`);
        return;
      }
      goTo(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : String(err));
    } finally {
      setResolving(false);
    }
  };

  return (
    <Section title="look up an address">
      <form
        onSubmit={submit}
        className="flex flex-col sm:flex-row gap-2 max-w-lg"
      >
        <input
          type="text"
          placeholder="0x… or name.eth"
          value={addrInput}
          onChange={(e) => setAddrInput(e.target.value)}
          className="flex-1 border border-black px-3 py-2 outline-none focus:border-pink"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={resolving}
          className="bg-pink text-white px-4 py-2 hover:bg-black disabled:opacity-50"
        >
          {resolving ? "resolving…" : "look up"}
        </button>
        {account && (
          <button
            type="button"
            onClick={() => goTo(account)}
            className="border border-black px-4 py-2 hover:bg-black hover:text-white"
          >
            use mine
          </button>
        )}
      </form>
      {error && (
        <p className="mt-3" style={{ color: "var(--offer)" }}>
          <span className="text-pink">■</span> {error}
        </p>
      )}
    </Section>
  );
}
