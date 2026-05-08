import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const makeReadClientMock = vi.fn();
const useWalletMock = vi.fn();

vi.mock("@/app/lib/cryptopunks", async (importActual) => {
  const actual =
    await importActual<typeof import("@/app/lib/cryptopunks")>();
  return {
    ...actual,
    makeReadClient: () => makeReadClientMock(),
  };
});

vi.mock("@/app/lib/wallet", () => ({
  useWallet: () => useWalletMock(),
  ConnectButton: {
    Custom: ({
      children,
    }: {
      children: (a: { mounted: boolean; openConnectModal: () => void }) => React.ReactNode;
    }) => <>{children({ mounted: true, openConnectModal: () => {} })}</>,
  },
}));

import { PunkView } from "@/app/components/PunkView";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const OWNER = "0x000000000000000000000000000000000000beef" as const;
const OTHER = "0x000000000000000000000000000000000000FACE" as const;
const BIDDER = "0x00000000000000000000000000000000000000B1" as const;

type Read = {
  punkIndexToAddress?: string;
  punksOfferedForSale?: readonly [boolean, bigint, string, bigint, string];
  punkBids?: readonly [boolean, bigint, string, bigint];
  punkImageSvg?: string;
  punkAttributes?: string;
};

function readContractFromShape(read: Read) {
  return vi.fn(({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case "punkIndexToAddress":
        return Promise.resolve(read.punkIndexToAddress ?? OWNER);
      case "punksOfferedForSale":
        return Promise.resolve(
          read.punksOfferedForSale ?? [false, 0n, ZERO, 0n, ZERO],
        );
      case "punkBids":
        return Promise.resolve(read.punkBids ?? [false, 0n, ZERO, 0n]);
      case "punkImageSvg":
        return Promise.resolve(
          read.punkImageSvg ?? 'data:image/svg+xml;utf8,<svg id="punk" />',
        );
      case "punkAttributes":
        return Promise.resolve(read.punkAttributes ?? "Male, Big Shades, Mole");
      default:
        return Promise.reject(new Error(`unmocked: ${functionName}`));
    }
  });
}

beforeEach(() => {
  window.localStorage.clear();
  makeReadClientMock.mockReset();
  useWalletMock.mockReset();
  useWalletMock.mockReturnValue({
    configured: false,
    account: null,
    chainId: null,
    walletClient: null,
  });
});

function mountClient(read: Read = {}, extra: Record<string, unknown> = {}) {
  const client = {
    readContract: readContractFromShape(read),
    simulateContract: vi.fn(),
    waitForTransactionReceipt: vi
      .fn()
      .mockResolvedValue({ status: "success" }),
    ...extra,
  };
  makeReadClientMock.mockReturnValue(client);
  return client;
}

describe("PunkView — loading and error states", () => {
  it("renders 'reading chain…' while readContract pending", () => {
    makeReadClientMock.mockReturnValue({
      readContract: vi.fn(() => new Promise(() => {})),
    });
    render(<PunkView index={1} />);
    expect(screen.getByText(/reading chain/i)).toBeInTheDocument();
  });

  it("renders the RPC setup hint when readContract rejects with RPC_URL error", async () => {
    makeReadClientMock.mockReturnValue({
      readContract: vi
        .fn()
        .mockRejectedValueOnce(new Error("RPC_URL is not configured"))
        .mockRejectedValueOnce(new Error("RPC_URL is not configured"))
        .mockRejectedValueOnce(new Error("RPC_URL is not configured")),
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByText(/RPC endpoint is not configured/i),
      ).toBeInTheDocument();
    });
  });
});

describe("PunkView — happy path", () => {
  it("renders the punk header, attributes, and not-for-sale state", async () => {
    mountClient({});
    render(<PunkView index={42} />);
    await waitFor(() => {
      expect(screen.getByText(/punk #42/i)).toBeInTheDocument();
    });
    expect(screen.getByText("not currently offered.")).toBeInTheDocument();
    expect(screen.getByText("no active bid.")).toBeInTheDocument();
    expect(screen.getByText("Big Shades")).toBeInTheDocument();
    expect(screen.getByText(/cryptopunks\.app/i)).toBeInTheDocument();
  });

  it("renders the for-sale section with min price and onlySellTo address", async () => {
    mountClient({
      punksOfferedForSale: [true, 0n, OWNER, 1500000000000000000n, OTHER],
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(screen.getByText(/offered at 1\.5 ETH/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/only to:/i)).toBeInTheDocument();
  });

  it("renders the top bid section when a bid exists", async () => {
    mountClient({
      punkBids: [true, 0n, BIDDER, 2000000000000000000n],
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(screen.getByText(/2 ETH/)).toBeInTheDocument();
    });
  });

  it("renders 'unassigned' when owner is the zero address", async () => {
    mountClient({ punkIndexToAddress: ZERO });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(screen.getByText("unassigned")).toBeInTheDocument();
    });
  });
});

describe("PunkView — connection prompts", () => {
  it("shows the wallet-not-configured prompt when wallet is unconfigured", async () => {
    mountClient();
    useWalletMock.mockReturnValue({
      configured: false,
      account: null,
      chainId: null,
      walletClient: null,
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(screen.getByText(/wallet not configured/i)).toBeInTheDocument();
    });
  });

  it("shows a connect button when configured but no account is connected", async () => {
    mountClient();
    useWalletMock.mockReturnValue({
      configured: true,
      account: null,
      chainId: null,
      walletClient: null,
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /connect wallet/i }),
      ).toBeInTheDocument();
    });
  });

  it("warns about wrong network when connected on a non-mainnet chain", async () => {
    mountClient();
    useWalletMock.mockReturnValue({
      configured: true,
      account: OWNER,
      chainId: 137,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByText(/switch your wallet to ethereum mainnet/i),
      ).toBeInTheDocument();
    });
  });
});

describe("PunkView — owner actions", () => {
  it("renders offer/transfer cards when connected wallet matches the owner", async () => {
    mountClient();
    useWalletMock.mockReturnValue({
      configured: true,
      account: OWNER,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^offer$/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /^transfer$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/you/, { selector: "span" })).toBeInTheDocument();
  });

  it("exposes accept-top-bid + withdraw-offer when applicable", async () => {
    mountClient({
      punksOfferedForSale: [true, 0n, OWNER, 1000000000000000000n, ZERO],
      punkBids: [true, 0n, BIDDER, 500000000000000000n],
    });
    useWalletMock.mockReturnValue({
      configured: true,
      account: OWNER,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /withdraw/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /^accept$/i }),
    ).toBeInTheDocument();
  });

  it("submits an offer through simulateContract + walletClient.writeContract", async () => {
    const writeContract = vi
      .fn()
      .mockResolvedValue(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      );
    const client = mountClient();
    (client.simulateContract as Mock).mockResolvedValue({
      request: { mocked: true },
    });
    useWalletMock.mockReturnValue({
      configured: true,
      account: OWNER,
      chainId: 1,
      walletClient: { writeContract },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^offer$/i }),
      ).toBeInTheDocument();
    });
    const priceInput = screen.getByPlaceholderText(/min price/i);
    fireEvent.change(priceInput, { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: /^offer$/i }));
    await waitFor(() => {
      expect(client.simulateContract).toHaveBeenCalled();
    });
    expect(writeContract).toHaveBeenCalledWith({ mocked: true });
  });
});

describe("PunkView — non-owner actions", () => {
  it("shows a buy card when the punk is offered for open sale", async () => {
    mountClient({
      punkIndexToAddress: OWNER,
      punksOfferedForSale: [true, 0n, OWNER, 1000000000000000000n, ZERO],
    });
    useWalletMock.mockReturnValue({
      configured: true,
      account: OTHER,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^buy$/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^bid$/i })).toBeInTheDocument();
  });

  it("hides buy when sale is restricted to a different address", async () => {
    mountClient({
      punkIndexToAddress: OWNER,
      punksOfferedForSale: [true, 0n, OWNER, 1000000000000000000n, BIDDER],
    });
    useWalletMock.mockReturnValue({
      configured: true,
      account: OTHER,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^bid$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^buy$/i })).toBeNull();
  });

  it("renders withdraw-bid when the connected user is the top bidder", async () => {
    mountClient({
      punkIndexToAddress: OWNER,
      punkBids: [true, 0n, OTHER, 100000000000000000n],
    });
    useWalletMock.mockReturnValue({
      configured: true,
      account: OTHER,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<PunkView index={1} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /withdraw bid/i }),
      ).toBeInTheDocument();
    });
  });
});
