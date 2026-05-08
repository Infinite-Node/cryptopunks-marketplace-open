# Contributing

**This repository does not accept outside contributions.**

It is published as a **template** — a reference implementation of a non-custodial CryptoPunks client that you are free to fork, modify, and run yourself under the [MIT license](LICENSE). Pull requests opened against this repo will be closed without review.

## What to do instead

- **Want to change something for your own deployment?** Fork the repo and modify your fork. That's what it's here for.
- **Found a bug or have a question about the reference?** Open a GitHub issue. We may or may not act on it, but it can serve as a signal to other forkers.
- **Found a security issue?** Please report it privately — see [SECURITY.md](SECURITY.md). Do not open a public issue.

## If you're forking

A few things worth knowing before you start hacking:

- This is **Next.js 16** with the App Router. APIs and conventions differ from Next 14/15 — see [AGENTS.md](AGENTS.md). When in doubt, read the version-specific docs in `node_modules/next/dist/docs/` rather than relying on older tutorials.
- **wagmi is pinned to v2** because RainbowKit 2.x only supports wagmi v2. Don't bump wagmi past 2 unless you also migrate RainbowKit.
- All contract addresses and ABIs live in [app/lib/cryptopunks.ts](app/lib/cryptopunks.ts). To target a testnet fork, change the addresses there and update the `mainnet` chain in [app/lib/wallet.tsx](app/lib/wallet.tsx) and [app/lib/cryptopunks.ts](app/lib/cryptopunks.ts).
- The `/api/rpc` proxy is open by default. Add rate limiting at the edge (Vercel WAF, Cloudflare, etc.) before deploying to production.
- Reads go through the server proxy; writes go directly from the user's wallet. There is no backend state — every page is either a server component reading onchain data via the proxy, or a client component using wagmi.

That's it. Have fun.
