import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

import DocsPage, { metadata } from "@/app/docs/page";

describe("/docs", () => {
  it("documents both env vars and the proxy architecture", () => {
    const { container } = render(<DocsPage />);
    const codes = Array.from(container.querySelectorAll("code")).map(
      (n) => n.textContent ?? "",
    );
    expect(codes).toContain("RPC_URL");
    expect(codes).toContain("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
    expect(codes).toContain("/api/rpc");
    expect(screen.getAllByText(/cloud\.reown\.com/i).length).toBeGreaterThan(0);
  });

  it("links the cryptopunks contract to etherscan", () => {
    render(<DocsPage />);
    const links = screen.getAllByRole("link");
    const etherscan = links.find((l) =>
      l.getAttribute("href")?.startsWith("https://etherscan.io/address/0x"),
    );
    expect(etherscan).toBeDefined();
  });

  it("exports a setup-flavored metadata title", () => {
    expect(metadata.title).toMatch(/setup/i);
  });
});
