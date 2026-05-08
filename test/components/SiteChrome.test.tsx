import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const useWalletMock = vi.fn();
type CustomChildArg = {
  account: { address: string; displayName: string } | null;
  chain: { unsupported: boolean } | null;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
  mounted: boolean;
};
let customChildArg: CustomChildArg = {
  account: null,
  chain: null,
  openAccountModal: () => {},
  openChainModal: () => {},
  openConnectModal: () => {},
  mounted: true,
};

vi.mock("@/app/lib/wallet", () => ({
  useWallet: () => useWalletMock(),
  ConnectButton: {
    Custom: ({
      children,
    }: {
      children: (a: CustomChildArg) => React.ReactNode;
    }) => <>{children(customChildArg)}</>,
  },
}));

import { Footer, Header, MobileWalletBar } from "@/app/components/SiteChrome";

beforeEach(() => {
  useWalletMock.mockReturnValue({ configured: false });
  customChildArg = {
    account: null,
    chain: null,
    openAccountModal: () => {},
    openChainModal: () => {},
    openConnectModal: () => {},
    mounted: true,
  };
});

describe("Header", () => {
  it("shows the 'wallet not configured' message when useWallet().configured is false", () => {
    render(<Header />);
    expect(
      screen.getByText(/wallet not configured/i),
    ).toBeInTheDocument();
    const setup = screen.getAllByRole("link", { name: /setup/i })[0];
    expect(setup).toHaveAttribute("href", "/docs");
  });

  it("toggles the mobile menu open and closed", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName(/close menu/i);
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the mobile menu when a nav link is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const homeLinks = screen.getAllByRole("link", { name: "home" });
    fireEvent.click(homeLinks[homeLinks.length - 1]);
    expect(
      screen.getByRole("button", { name: /open menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("renders a connect button when configured but no account", () => {
    useWalletMock.mockReturnValue({ configured: true });
    customChildArg = { ...customChildArg, mounted: true, account: null };
    render(<Header />);
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("calls openConnectModal when the connect button is clicked", () => {
    const open = vi.fn();
    useWalletMock.mockReturnValue({ configured: true });
    customChildArg = { ...customChildArg, openConnectModal: open };
    render(<Header />);
    fireEvent.click(
      screen.getByRole("button", { name: /connect wallet/i }),
    );
    expect(open).toHaveBeenCalled();
  });

  it("renders a 'wrong network' button when chain is unsupported", () => {
    useWalletMock.mockReturnValue({ configured: true });
    customChildArg = {
      ...customChildArg,
      account: { address: "0xabc", displayName: "vitalik.eth" },
      chain: { unsupported: true },
    };
    render(<Header />);
    expect(
      screen.getByRole("button", { name: /wrong network/i }),
    ).toBeInTheDocument();
  });

  it("renders the connected account button on the happy path", () => {
    useWalletMock.mockReturnValue({ configured: true });
    customChildArg = {
      ...customChildArg,
      account: {
        address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
        displayName: "vitalik.eth",
      },
      chain: { unsupported: false },
    };
    render(<Header />);
    const btn = screen.getByRole("button", { name: /vitalik\.eth/i });
    expect(btn).toHaveAttribute(
      "title",
      "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    );
  });

  it("renders nothing inside ConnectButton.Custom while not mounted", () => {
    useWalletMock.mockReturnValue({ configured: true });
    customChildArg = { ...customChildArg, mounted: false };
    render(<Header />);
    expect(
      screen.queryByRole("button", { name: /connect wallet/i }),
    ).toBeNull();
  });
});

describe("MobileWalletBar", () => {
  it("renders the wallet widget", () => {
    useWalletMock.mockReturnValue({ configured: false });
    render(<MobileWalletBar />);
    expect(
      screen.getByText(/wallet not configured/i),
    ).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("links to setup, github, and the contract", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "setup" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(screen.getByRole("link", { name: "github" })).toHaveAttribute(
      "href",
      "https://github.com/Infinite-Node/cryptopunks-marketplace-open",
    );
    const contract = screen.getByRole("link", { name: "contract" });
    expect(contract.getAttribute("href")).toMatch(
      /^https:\/\/etherscan\.io\/address\/0x/,
    );
  });
});
