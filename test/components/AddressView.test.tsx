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
}));

import { AddressView } from "@/app/components/AddressView";
import { cacheKeys } from "@/app/lib/storage";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const ADDR = "0x000000000000000000000000000000000000bEEF" as const;
const STASH = "0x000000000000000000000000000000000000FACE" as const;

type Reads = {
  balance?: bigint;
  pending?: bigint;
  ensName?: string | null;
  stashAddress?: string;
  hasDeployed?: boolean;
};

function readContractFromShape(reads: Reads) {
  return vi.fn(({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case "balanceOf":
        return Promise.resolve(reads.balance ?? 0n);
      case "pendingWithdrawals":
        return Promise.resolve(reads.pending ?? 0n);
      case "stashAddressFor":
        return Promise.resolve(reads.stashAddress ?? STASH);
      case "ownerHasDeployed":
        return Promise.resolve(reads.hasDeployed ?? false);
      default:
        return Promise.reject(new Error(`unmocked: ${functionName}`));
    }
  });
}

function mountClient(
  reads: Reads = {},
  extras: Partial<{
    multicall: Mock;
    getBalance: Mock;
    getEnsName: Mock;
    simulateContract: Mock;
  }> = {},
) {
  const client = {
    readContract: readContractFromShape(reads),
    multicall: extras.multicall ?? vi.fn(),
    getBalance: extras.getBalance ?? vi.fn().mockResolvedValue(0n),
    getEnsName: extras.getEnsName ?? vi.fn().mockResolvedValue(reads.ensName ?? null),
    simulateContract:
      extras.simulateContract ?? vi.fn().mockResolvedValue({ request: {} }),
    waitForTransactionReceipt: vi
      .fn()
      .mockResolvedValue({ status: "success" }),
  };
  makeReadClientMock.mockReturnValue(client);
  return client;
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

describe("AddressView — loading and error states", () => {
  it("renders 'reading chain…' while reads pending", () => {
    makeReadClientMock.mockReturnValue({
      readContract: vi.fn(() => new Promise(() => {})),
      getEnsName: vi.fn(() => new Promise(() => {})),
      multicall: vi.fn(),
      getBalance: vi.fn(),
    });
    render(<AddressView addr={ADDR} />);
    expect(screen.getByText(/reading chain/i)).toBeInTheDocument();
  });

  it("renders the RpcError UI when reads reject with a setup-style error", async () => {
    makeReadClientMock.mockReturnValue({
      readContract: vi
        .fn()
        .mockRejectedValue(new Error("RPC_URL is not configured")),
      getEnsName: vi.fn().mockResolvedValue(null),
      multicall: vi.fn(),
      getBalance: vi.fn(),
    });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(
        screen.getByText(/RPC endpoint is not configured/i),
      ).toBeInTheDocument();
    });
  });
});

describe("AddressView — happy path", () => {
  it("renders balance, pending, and stash details for an address with zero punks", async () => {
    mountClient({ balance: 0n, pending: 1500000000000000000n });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(screen.getByText("punks held")).toBeInTheDocument();
    });
    expect(screen.getByText("0", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("1.5 ETH")).toBeInTheDocument();
    expect(screen.getByText(/not yet/i)).toBeInTheDocument();
  });

  it("shows the reverse-ENS line when getEnsName resolves a name", async () => {
    mountClient(
      { ensName: "vitalik.eth" },
      { getEnsName: vi.fn().mockResolvedValue("vitalik.eth") },
    );
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(screen.getByText(/■ vitalik\.eth/)).toBeInTheDocument();
    });
  });

  it("uses cached holdings (TTL) when present and renders matched punks", async () => {
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.ownership(ADDR)}`,
      JSON.stringify({ t: Date.now(), v: [3, 7] }),
    );
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.punkSvg(3)}`,
      JSON.stringify('data:image/svg+xml;utf8,<svg id="p3" />'),
    );
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.punkSvg(7)}`,
      JSON.stringify('data:image/svg+xml;utf8,<svg id="p7" />'),
    );

    const multicall = vi
      .fn()
      .mockResolvedValueOnce([
        { status: "success", result: [false, 0n, ZERO, 0n, ZERO] },
        { status: "success", result: [true, 0n, ZERO, 0n, ZERO] },
      ])
      .mockResolvedValueOnce([
        { status: "success", result: [false, 0n, ZERO, 0n] },
        { status: "success", result: [true, 0n, ZERO, 0n] },
      ]);
    mountClient({ balance: 2n }, { multicall });

    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Punk #3/ })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /Punk #7/ })).toBeInTheDocument();
  });

  it("renders the deployed stash balance when the factory reports deployed", async () => {
    mountClient(
      { hasDeployed: true, balance: 0n },
      { getBalance: vi.fn().mockResolvedValue(2500000000000000000n) },
    );
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(screen.getByText(/deployed/i)).toBeInTheDocument();
    });
    expect(screen.getByText("2.5 ETH")).toBeInTheDocument();
  });
});

describe("AddressView — owner-only action cards", () => {
  it("shows the withdraw-pending card for the connected wallet", async () => {
    mountClient({ pending: 1000000000000000000n });
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^withdraw$/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows the deploy-stash card when stash is not yet deployed and viewer is self", async () => {
    mountClient({ hasDeployed: false });
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^deploy$/i }),
      ).toBeInTheDocument();
    });
  });

  it("hides the deploy-stash card when viewer is not the address owner", async () => {
    mountClient({ hasDeployed: false });
    useWalletMock.mockReturnValue({
      configured: true,
      account: STASH,
      chainId: 1,
      walletClient: { writeContract: vi.fn() },
    });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(screen.getByText("punks held")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^deploy$/i })).toBeNull();
  });

  it("submits the withdraw action through walletClient.writeContract", async () => {
    const writeContract = vi
      .fn()
      .mockResolvedValue(
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      );
    const client = mountClient({ pending: 1000000000000000000n });
    useWalletMock.mockReturnValue({
      configured: true,
      account: ADDR,
      chainId: 1,
      walletClient: { writeContract },
    });
    render(<AddressView addr={ADDR} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^withdraw$/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^withdraw$/i }));
    await waitFor(() => {
      expect(client.simulateContract).toHaveBeenCalled();
    });
    expect(writeContract).toHaveBeenCalled();
  });
});
