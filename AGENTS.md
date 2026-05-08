# Next.js 16 quirks

Dynamic route `params` are a `Promise`. Unwrap with React's `use()` in client components, or `await` in server components. Pattern in [app/punk/[id]/page.tsx](app/punk/[id]/page.tsx#L8-L13). When in doubt, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

# Architecture invariants

- **`RPC_URL` is server-only.** Never prefix with `NEXT_PUBLIC_`. All reads go through the proxy at [app/api/rpc/route.ts](app/api/rpc/route.ts); the viem client in [app/lib/cryptopunks.ts](app/lib/cryptopunks.ts) (`makeReadClient`) points at `/api/rpc`, not at the upstream RPC.
- **Writes never touch the server.** RainbowKit + wagmi sign in the user's browser. Don't add server-side wallet code or move signing flows to API routes.
- **Contract addresses and ABIs live in [app/lib/cryptopunks.ts](app/lib/cryptopunks.ts).** ABIs are typed `as const` so viem inference works — preserve that if you split the file.

# Visual conventions

- **The palette in [app/globals.css](app/globals.css) is canonical:** `--pink`, `--sold`, `--offer`, `--bid`, `--transfer` (plus `--background` / `--foreground`). Use Tailwind classes (`text-pink`, `bg-sold`, …) or `var(--…)` inline. Do not introduce new color tokens.
- **Monospace everywhere.** A `*` rule in `globals.css` forces `ui-monospace` site-wide; don't add font-family overrides.
- **Render contract SVGs inline via `dangerouslySetInnerHTML`, not `<img src>`.** The `data:image/svg+xml;utf8,…` URL contains unescaped `#` characters that browsers truncate as URL fragments. See [app/components/AttributeView.tsx](app/components/AttributeView.tsx).

# Pinned dependencies

- **wagmi 2.x + RainbowKit 2.x.** RainbowKit 2.x only supports wagmi 2.x — don't bump wagmi past 2 without migrating RainbowKit in lockstep.
- viem 2.x, Tailwind 4 (CSS-first config in `globals.css`; no `tailwind.config.js` `theme` object), React 19, ESLint flat config.

# Testing

Vitest + React Testing Library, jsdom environment. Tests live under [test/](test/) mirroring `app/` (e.g. [test/components/PunkView.test.tsx](test/components/PunkView.test.tsx) covers [app/components/PunkView.tsx](app/components/PunkView.tsx); shared helpers in [test/utils/](test/utils/)). Imports use the `@/` path alias — `@/app/…` for source, `@/test/utils/…` for helpers — wired via `vite-tsconfig-paths` in [vitest.config.ts](vitest.config.ts). When mocking with `vi.mock`, use the same `@/app/…` form so the resolved module-path matches what the source imports. One-shot run: `npm test -- --run`. Coverage report (v8 provider, text + html + lcov): `npm run test:coverage` — output lands in `coverage/`.
