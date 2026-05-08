import { CRYPTOPUNKS_ADDRESS } from "../lib/cryptopunks";
import { Footer, Header } from "../components/SiteChrome";

export const metadata = {
  title: "setup // cryptopunks open source",
  description: "how to configure the cryptopunks viewer.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 py-10 max-w-3xl w-full flex flex-col gap-8">
        <div className="border border-black p-6 flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-bold">
              {"// "}overview
            </h2>
            <p>
              this site reads the cryptopunks contract (
              <a
                href={`https://etherscan.io/address/${CRYPTOPUNKS_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {CRYPTOPUNKS_ADDRESS}
              </a>
              ) through a server-side proxy at{" "}
              <code className="bg-black text-white px-1.5 mx-0.5">/api/rpc</code> and
              sends transactions through the visitor&rsquo;s browser wallet via
              rainbowkit. two environment variables drive everything.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">
              {"// "}environment
            </h2>
            <pre className="bg-black text-white p-4 overflow-x-auto">
{`# .env.local
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </pre>
            <ul className="flex flex-col gap-2 list-none pl-0">
              <li>
                <span className="text-pink">■</span>{" "}
                <code className="bg-black text-white px-1.5 mx-0.5">RPC_URL</code> — any
                ethereum mainnet json-rpc endpoint. server-only, never bundled.
                do <em>not</em> prefix with{" "}
                <code className="bg-black text-white px-1.5 mx-0.5">NEXT_PUBLIC_</code>.
              </li>
              <li>
                <span className="text-pink">■</span>{" "}
                <code className="bg-black text-white px-1.5 mx-0.5">
                  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
                </code>{" "}
                — get one from{" "}
                <a
                  href="https://cloud.reown.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  cloud.reown.com
                </a>
                . used by rainbowkit to power the wallet connect modal. this
                value is meant to be public.
              </li>
            </ul>
            <p>
              restart{" "}
              <code className="bg-black text-white px-1.5 mx-0.5">next dev</code> after
              changing any of these.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">
              {"// "}reads vs. writes
            </h2>
            <p>
              reads go through{" "}
              <code className="bg-black text-white px-1.5 mx-0.5">/api/rpc</code>, which
              forwards json-rpc requests to your{" "}
              <code className="bg-black text-white px-1.5 mx-0.5">RPC_URL</code>. the
              url never reaches the browser, so it&rsquo;s safe to put a secret
              api key in it.
            </p>
            <p>
              writes never touch the server. rainbowkit renders the wallet
              picker; the connected wallet signs and broadcasts every
              transaction directly. supported actions: buy, place / withdraw
              bid, accept top bid, offer for sale / withdraw offer, transfer,
              and withdraw pending balances.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">
              {"// "}deployment notes
            </h2>
            <ul className="flex flex-col gap-2 list-none pl-0">
              <li>
                <span className="text-pink">■</span> set{" "}
                <code className="bg-black text-white px-1.5 mx-0.5">RPC_URL</code> as a
                server-side secret in your hosting platform — it must stay
                server-only.
              </li>
              <li>
                <span className="text-pink">■</span> the proxy at{" "}
                <code className="bg-black text-white px-1.5 mx-0.5">/api/rpc</code> is
                open to the internet — add rate limiting at the edge for
                production use.
              </li>
              <li>
                <span className="text-pink">■</span> add this site&rsquo;s
                origin to the &ldquo;allowed domains&rdquo; list for your
                walletconnect project on{" "}
                <a
                  href="https://cloud.reown.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  cloud.reown.com
                </a>{" "}
                before deploying.
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
