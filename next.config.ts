import type { NextConfig } from "next";

// Baseline security headers. Tightened where possible without breaking
// RainbowKit / WalletConnect (which needs https connections to relay endpoints
// and inline styles in the wallet modal).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Next.js + Tailwind inject inline styles; RainbowKit injects styles too.
      "style-src 'self' 'unsafe-inline'",
      // Next dev needs eval; production builds don't. Keep both for parity.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // WalletConnect / RainbowKit relay endpoints + ENS/avatar lookups.
      "connect-src 'self' https: wss:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
