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

import { StashFactoryPanel } from "@/app/contracts/StashFactoryPanel";

const ADDR = "0x000000000000000000000000000000000000bEEF" as const;
const STASH = "0x000000000000000000000000000000000000FACE" as const;

type Reads = {
  stashAddress?: string;
  hasDeployed?: boolean;
  balance?: bigint;
};

function makeClient(reads: Reads = {}, extras: Partial<{
  getEnsAddress: Mock;
  simulateContract: Mock;
}> = {}) {
  return {
    readContract: vi.fn(({ functionName }: { functionName: string }) => {
      if (functionName === "stashAddressFor")
        return Promise.resolve(reads.stashAddress ?? STASH);
      if (functionName === "ownerHasDeployed")
        return Promise.resolve(reads.hasDeployed ?? false);
      return Promise.reject(new Error(`unmocked: ${functionName}`));
    }),
    getBalance: vi.fn().mockResolvedValue(reads.balance ?? 0n),
    getEnsAddress: extras.getEnsAddress ?? vi.fn(),
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

describe("StashFactoryPanel — lookup", () => {
  it("looks up a stash for a 0x address and renders the result", async () => {
    makeReadClientMock.mockReturnValue(makeClient({ hasDeployed: false }));
    render(<StashFactoryPanel />);
    const input = screen.getByPlaceholderText(/owner 0x/i);
    fireEvent.change(input, { target: { value: ADDR } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("stash address")).toBeInTheDocument();
    });
    expect(screen.getByText(/not yet/i)).toBeInTheDocument();
  });

  it("rejects free-form text without a dot or 0x prefix", async () => {
    makeReadClientMock.mockReturnValue(makeClient());
    render(<StashFactoryPanel />);
    const input = screen.getByPlaceholderText(/owner 0x/i);
    fireEvent.change(input, { target: { value: "garbage" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText(/enter a 0x address or an ENS name/i),
      ).toBeInTheDocument();
    });
  });

  it("resolves an ENS name and looks up the resolved address", async () => {
    const client = makeClient(
      { hasDeployed: true, balance: 3000000000000000000n },
      { getEnsAddress: vi.fn().mockResolvedValue(ADDR) },
    );
    makeReadClientMock.mockReturnValue(client);
    render(<StashFactoryPanel />);
    const input = screen.getByPlaceholderText(/owner 0x/i);
    fireEvent.change(input, { target: { value: "vitalik.eth" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("3 ETH")).toBeInTheDocument();
    });
    expect((client.getEnsAddress as Mock).mock.calls[0][0]).toEqual({
      name: "vitalik.eth",
    });
  });

  it("renders 'No address found' when ENS resolution returns null", async () => {
    const client = makeClient(
      {},
      { getEnsAddress: vi.fn().mockResolvedValue(null) },
    );
    makeReadClientMock.mockReturnValue(client);
    render(<StashFactoryPanel />);
    const input = screen.getByPlaceholderText(/owner 0x/i);
    fireEvent.change(input, { target: { value: "missing.eth" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText(/no address found for missing\.eth/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the first line of an unexpected error from ENS lookup", async () => {
    const client = makeClient(
      {},
      {
        getEnsAddress: vi
          .fn()
          .mockRejectedValue(new Error("rpc broken\nstack")),
      },
    );
    makeReadClientMock.mockReturnValue(client);
    render(<StashFactoryPanel />);
    const input = screen.getByPlaceholderText(/owner 0x/i);
    fireEvent.change(input, { target: { value: "x.eth" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("rpc broken")).toBeInTheDocument();
    });
  });
});

describe("StashFactoryPanel — connect prompt", () => {
  it("shows the connect-wallet prompt when no account is connected", () => {
    makeReadClientMock.mockReturnValue(makeClient());
    useWalletMock.mockReturnValue({
      configured: true,
      account: null,
      chainId: null,
      walletClient: null,
    });
    render(<StashFactoryPanel />);
    expect(
      screen.getByText(/connect a wallet to deploy your own stash/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });
});

describe("StashFactoryPanel — deploy", () => {
  it("renders the deploy button when connected and stash is undeployed", async () => {
    makeReadClientMock.mockReturnValue(makeClient({ hasDeployed: false }));
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<StashFactoryPanel />);
    expect(
      screen.getByRole("button", { name: /^deploy$/i }),
    ).toBeInTheDocument();
  });

  it("uses 'use mine' to look up the connected wallet's stash", async () => {
    makeReadClientMock.mockReturnValue(makeClient({ hasDeployed: false }));
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<StashFactoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /use mine/i }));
    await waitFor(() => {
      expect(screen.getByText("stash address")).toBeInTheDocument();
    });
  });

  it("hides the deploy form when the connected user already has a deployed stash", async () => {
    makeReadClientMock.mockReturnValue(makeClient({ hasDeployed: true }));
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<StashFactoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /use mine/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/your stash is already deployed/i),
      ).toBeInTheDocument();
    });
  });

  it("warns about wrong chain in the deploy section", () => {
    makeReadClientMock.mockReturnValue(makeClient({ hasDeployed: false }));
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 137,
      walletClient: { writeContract: vi.fn() },
    });
    render(<StashFactoryPanel />);
    expect(
      screen.getByText(/switch your wallet to ethereum mainnet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^deploy$/i })).toBeDisabled();
  });

  it("dispatches deployStash via the wallet client and renders the tx hash", async () => {
    const writeContract = vi
      .fn()
      .mockResolvedValue(
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      );
    const client = makeClient({ hasDeployed: false });
    makeReadClientMock.mockReturnValue(client);
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract },
    });
    render(<StashFactoryPanel />);
    fireEvent.click(screen.getByRole("button", { name: /^deploy$/i }));
    await waitFor(() => {
      expect(client.simulateContract).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText(/confirmed/)).toBeInTheDocument();
    });
  });
});
