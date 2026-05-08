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

import { ProcessPunkBidPanel } from "@/app/contracts/ProcessPunkBidPanel";

const ACCOUNT = "0x000000000000000000000000000000000000bEEF" as const;
const STASH = "0x000000000000000000000000000000000000face" as const;

function makeClient(extras: Partial<{
  simulateContract: Mock;
  readContract: Mock;
}> = {}) {
  return {
    readContract:
      extras.readContract ?? vi.fn().mockResolvedValue(STASH),
    simulateContract:
      extras.simulateContract ?? vi.fn().mockResolvedValue({ request: {} }),
    waitForTransactionReceipt: vi
      .fn()
      .mockResolvedValue({ status: "success" }),
  };
}

beforeEach(() => {
  makeReadClientMock.mockReset();
  useWalletMock.mockReset();
  useWalletMock.mockReturnValue({
    configured: false,
    account: null,
    chainId: null,
    walletClient: null,
  });
});

describe("ProcessPunkBidPanel — input validation", () => {
  it("flags a non-address stash input", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/0x… stash to call/i), {
      target: { value: "garbage" },
    });
    expect(screen.getByText(/not a valid 0x address/i)).toBeInTheDocument();
  });

  it("disables the validate button when no JSON has been entered", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    expect(screen.getByRole("button", { name: /validate/i })).toBeDisabled();
  });

  it("fills the template when 'fill template' is clicked", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.click(screen.getByRole("button", { name: /fill template/i }));
    const textarea = screen.getByPlaceholderText(
      /paste a processPunkBid/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/punkIndex/);
  });

  it("reports a JSON parse error for malformed input", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste a processPunkBid/i), {
      target: { value: "not json" },
    });
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(screen.getByText(/invalid JSON/i)).toBeInTheDocument();
  });

  it("reports a missing 'bid' field", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste a processPunkBid/i), {
      target: { value: "{}" },
    });
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(
      screen.getByText(/bid: missing or not an object/i),
    ).toBeInTheDocument();
  });

  it("rejects a non-32-byte root hash", () => {
    const bad = JSON.stringify({
      bid: {
        order: {
          numberOfUnits: 1,
          pricePerUnit: "1",
          auction: "0x0000000000000000000000000000000000000000",
        },
        accountNonce: 0,
        bidNonce: 0,
        expiration: 0,
        root: "0x1234",
      },
      punkIndex: 0,
      signature: "0x",
      proof: [],
    });
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste a processPunkBid/i), {
      target: { value: bad },
    });
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(
      screen.getByText(/bid\.root: must be a 0x-prefixed 32-byte hex string/i),
    ).toBeInTheDocument();
  });

  it("renders decoded args after a successful validation of the template", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.click(screen.getByRole("button", { name: /fill template/i }));
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(screen.getByText("decoded args")).toBeInTheDocument();
  });

  it("rejects negative numeric strings", () => {
    const bad = JSON.stringify({
      bid: {
        order: {
          numberOfUnits: 1,
          pricePerUnit: "1",
          auction: "0x0000000000000000000000000000000000000000",
        },
        accountNonce: -1,
        bidNonce: 0,
        expiration: 0,
        root: "0x" + "0".repeat(64),
      },
      punkIndex: 0,
      signature: "0x",
      proof: [],
    });
    makeReadClientMock.mockReturnValue(makeClient());
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste a processPunkBid/i), {
      target: { value: bad },
    });
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(
      screen.getByText(/bid\.accountNonce: must be a non-negative integer/i),
    ).toBeInTheDocument();
  });
});

describe("ProcessPunkBidPanel — wallet integration", () => {
  it("shows the connect-wallet prompt when configured but not connected", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    useWalletMock.mockReturnValue({
      configured: true,
      account: null,
      chainId: null,
      walletClient: null,
    });
    render(<ProcessPunkBidPanel />);
    expect(
      screen.getByText(/connect a wallet to submit the call/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("warns about wrong chain when connected to a non-mainnet chain", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    useWalletMock.mockReturnValue({
      configured: true,
      account: ACCOUNT,
      chainId: 137,
      walletClient: { writeContract: vi.fn() },
    });
    render(<ProcessPunkBidPanel />);
    expect(
      screen.getByText(/switch your wallet to ethereum mainnet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send processPunkBid/i }),
    ).toBeDisabled();
  });

  it("uses the connected account's stash via 'use mine'", async () => {
    const client = makeClient({
      readContract: vi.fn().mockResolvedValue(STASH),
    });
    makeReadClientMock.mockReturnValue(client);
    useWalletMock.mockReturnValue({
      configured: true,
      account: ACCOUNT,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<ProcessPunkBidPanel />);
    fireEvent.click(screen.getByRole("button", { name: /use mine/i }));
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText(/0x… stash to call/i) as HTMLInputElement)
          .value,
      ).toBe(STASH);
    });
  });

  it("submits the call when stash, parsed bid, and wallet are all ready", async () => {
    const writeContract = vi
      .fn()
      .mockResolvedValue(
        "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      );
    const client = makeClient();
    makeReadClientMock.mockReturnValue(client);
    useWalletMock.mockReturnValue({
      configured: true,
      account: ACCOUNT,
      chainId: 1,
      walletClient: { writeContract },
    });
    render(<ProcessPunkBidPanel />);
    fireEvent.change(screen.getByPlaceholderText(/0x… stash to call/i), {
      target: { value: STASH },
    });
    fireEvent.click(screen.getByRole("button", { name: /fill template/i }));
    fireEvent.click(screen.getByRole("button", { name: /validate/i }));
    await waitFor(() => {
      expect(screen.getByText("decoded args")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /send processPunkBid/i }),
      ).not.toBeDisabled();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send processPunkBid/i }),
    );
    await waitFor(() => {
      expect(client.simulateContract).toHaveBeenCalled();
    });
    expect(writeContract).toHaveBeenCalled();
  });
});
