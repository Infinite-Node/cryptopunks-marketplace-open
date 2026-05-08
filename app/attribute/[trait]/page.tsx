"use client";

import Link from "next/link";
import { use } from "react";
import { Footer, Header } from "../../components/SiteChrome";
import { AttributeView } from "../../components/AttributeView";

export default function AttributePage({
  params,
}: {
  params: Promise<{ trait: string }>;
}) {
  const { trait } = use(params);
  const decoded = decodeURIComponent(trait);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-5xl w-full flex flex-col gap-4">
        <div>
          <Link href="/">← search</Link>
        </div>
        <AttributeView trait={decoded} />
      </main>
      <Footer />
    </div>
  );
}
