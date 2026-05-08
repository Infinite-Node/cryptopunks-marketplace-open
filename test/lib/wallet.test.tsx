import { render, screen } from "@testing-library/react";
import { useWallet, WalletProvider } from "@/app/lib/wallet";

function Probe() {
  const w = useWallet();
  return (
    <div>
      <span data-testid="configured">{String(w.configured)}</span>
      <span data-testid="account">{w.account ?? "null"}</span>
      <span data-testid="chain">{w.chainId ?? "null"}</span>
    </div>
  );
}

describe("WalletProvider", () => {
  it("returns DISABLED_STATE when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is unset", () => {
    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>,
    );
    expect(screen.getByTestId("configured")).toHaveTextContent("false");
    expect(screen.getByTestId("account")).toHaveTextContent("null");
    expect(screen.getByTestId("chain")).toHaveTextContent("null");
  });

  it("renders children even when disabled", () => {
    render(
      <WalletProvider>
        <span data-testid="child">hello</span>
      </WalletProvider>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });
});

describe("useWallet (default context)", () => {
  it("returns the disabled state outside of a provider", () => {
    render(<Probe />);
    expect(screen.getByTestId("configured")).toHaveTextContent("false");
  });
});
