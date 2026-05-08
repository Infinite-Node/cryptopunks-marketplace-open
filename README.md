# cryptopunks open source

A minimal, non-custodial reference client for the [CryptoPunks](https://www.cryptopunks.app) ecosystem. Look up any punk or address, render its onchain SVG straight from `CryptopunksData`, and place / withdraw / accept bids and offers from your own wallet.

This repo is intended as a **template**: fork it, point it at your own RPC, and ship. It is not the official marketplace — for real trading use [cryptopunks.app](https://www.cryptopunks.app).

We do not accept outside contributions to this repo — see [CONTRIBUTING.md](CONTRIBUTING.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## What's in here

- Read-only proxy at `/api/rpc` so a private RPC key (Alchemy, Infura, etc.) stays server-side
- Wallet writes via [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh) — every transaction is signed in the user's browser, nothing custodial
- Onchain SVG rendering from the `CryptopunksData` contract (no IPFS, no off-chain image pipeline)
- Pages for individual punks, addresses (with ENS resolution), and per-attribute lookups
- A `/contracts` panel that exposes the canonical CryptoPunks contracts plus the StashFactory and `processPunkBid` flow used by the broader ecosystem

Contracts touched (mainnet):

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| CryptoPunks           | `0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB` |
| CryptopunksData       | `0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2` |
| WrappedPunks (legacy) | `0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6` |
| CryptoPunks 721       | `0x000000000000003607fce1aC9e043a86675C5C2F` |
| StashFactory          | `0x000000000000A6fA31F5fC51c1640aAc76866750` |

## Quick start

```bash
git clone https://github.com/Infinite-Node/cryptopunks-marketplace-open
cd cryptopunks-marketplace-open
cp .env.example .env.local
# fill in RPC_URL and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm install
npm run dev
```

Open <http://localhost:3000>.

## Tests

```bash
npm test               # watch mode
npm test -- --run      # one-shot
npm run test:coverage  # one-shot with coverage report (text + html + lcov)
```

[Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react). Tests live in `test/`, mirroring the `app/` layout. Imports use the `@/` path alias (`@/app/…` for source, `@/test/utils/…` for helpers). Coverage output lands in `coverage/` (gitignored).

## Environment

```bash
# .env.local
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- **`RPC_URL`** — any Ethereum mainnet JSON-RPC endpoint. Server-only, never bundled into the client. Do **not** prefix with `NEXT_PUBLIC_`. Reads are proxied through `/api/rpc` so the URL (and any embedded API key) stays private.
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** — get one from [cloud.reown.com](https://cloud.reown.com). Used by RainbowKit's wallet connect modal. This value is meant to be public, but remember to add your deployed origin to the project's allowed-domains list.

Restart the dev server after changing env vars.

## Architecture

**Reads** flow through `app/api/rpc/route.ts`, which forwards JSON-RPC requests to `RPC_URL`. The viem client in `app/lib/cryptopunks.ts` (`makeReadClient`) points at the proxy, so the upstream URL never reaches the browser.

**Writes** never touch the server. RainbowKit renders the wallet picker; the connected wallet signs and broadcasts directly to the canonical contracts. Supported actions:

- buy a listed punk
- place / withdraw a bid
- accept the top bid on a punk you own
- offer for sale (open or to a specific address) / withdraw offer
- transfer
- withdraw pending balances

ABIs live inline in `app/lib/cryptopunks.ts`, typed `as const` so viem inference works out of the box. Contract addresses are in the same file — swap them for testnet forks.

## Deploying

- Set `RPC_URL` as a **server-side secret** in your hosting platform. It must stay server-only.
- The proxy at `/api/rpc` is open to the internet. **Add rate limiting at the edge** (Vercel WAF, Cloudflare, etc.) before production — without it, anyone can drain your RPC quota.
- Add the deployed origin to your WalletConnect project's allowed domains on [cloud.reown.com](https://cloud.reown.com).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) — note: APIs and conventions differ from Next 14/15; see [AGENTS.md](AGENTS.md)
- React 19
- [wagmi](https://wagmi.sh) v2 + [RainbowKit](https://www.rainbowkit.com) 2.x (RainbowKit 2.x only supports wagmi v2 — don't bump wagmi past 2)
- [viem](https://viem.sh) v2
- Tailwind CSS v4

## License

MIT — see [LICENSE](LICENSE).
