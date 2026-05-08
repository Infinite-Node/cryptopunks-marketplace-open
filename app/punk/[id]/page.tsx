"use client";

import Link from "next/link";
import { use } from "react";
import { Footer, Header } from "../../components/SiteChrome";
import { PunkView } from "../../components/PunkView";

export default function PunkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const n = Number(id);
  const valid = Number.isInteger(n) && n >= 0 && n <= 9999;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-5xl w-full flex flex-col gap-4">
        <div>
          <Link href="/">← search</Link>
        </div>
        {valid ? (
          <PunkView index={n} />
        ) : (
          <div className="border border-black p-4">
            <p style={{ color: "var(--offer)" }}>
              <span className="text-pink">■</span> invalid punk index{" "}
              <code className="bg-black text-white px-1">{id}</code>. must be
              an integer between 0 and 9999.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
