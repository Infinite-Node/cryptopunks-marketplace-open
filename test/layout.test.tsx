import { renderToString } from "react-dom/server";
import { vi } from "vitest";

vi.mock("@/app/lib/wallet", () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-provider">{children}</div>
  ),
}));
vi.mock("@/app/components/SiteChrome", () => ({
  MobileWalletBar: () => <div data-testid="mobile-wallet-bar" />,
}));

import RootLayout, { metadata } from "@/app/layout";

describe("RootLayout", () => {
  it("renders <html>/<body>, wraps children in WalletProvider, and includes the mobile bar", () => {
    const html = renderToString(
      <RootLayout>
        <div data-testid="page">child page</div>
      </RootLayout>,
    );
    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain('data-testid="wallet-provider"');
    expect(html).toContain('data-testid="page"');
    expect(html).toContain("child page");
    expect(html).toContain('data-testid="mobile-wallet-bar"');
  });

  it("exports site metadata", () => {
    expect(metadata.title).toBe("cryptopunks open source");
    expect(metadata.description).toMatch(/cryptopunks contract/i);
  });
});
