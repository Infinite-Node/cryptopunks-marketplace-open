import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { PublicClient } from "viem";
import {
  ActionCard,
  Field,
  RpcError,
  Section,
  eqAddr,
  etherscanAddress,
  etherscanPunk,
  etherscanTx,
  formatReadError,
  shortenAddress,
} from "@/app/lib/ui";

describe("shortenAddress", () => {
  it("shortens long addresses", () => {
    expect(
      shortenAddress("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB"),
    ).toBe("0xb47e…3BBB");
  });

  it("returns short input unchanged", () => {
    expect(shortenAddress("0xabc")).toBe("0xabc");
  });

  it("returns empty input unchanged", () => {
    expect(shortenAddress("")).toBe("");
  });
});

describe("eqAddr", () => {
  it("matches addresses case-insensitively", () => {
    expect(
      eqAddr(
        "0xB47E3CD837DDF8E4C57F05D70AB865DE6E193BBB",
        "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
      ),
    ).toBe(true);
  });

  it("returns false when either side is missing", () => {
    expect(eqAddr(null, "0x0")).toBe(false);
    expect(eqAddr("0x0", undefined)).toBe(false);
    expect(eqAddr(null, null)).toBe(false);
  });

  it("returns false on mismatch", () => {
    expect(eqAddr("0x1", "0x2")).toBe(false);
  });
});

describe("etherscan helpers", () => {
  it("builds an address url", () => {
    expect(etherscanAddress("0xabc")).toBe("https://etherscan.io/address/0xabc");
  });

  it("builds a tx url", () => {
    expect(etherscanTx("0xdef")).toBe("https://etherscan.io/tx/0xdef");
  });

  it("builds a punk url", () => {
    expect(etherscanPunk(42)).toBe(
      "https://www.cryptopunks.app/cryptopunks/details/42",
    );
  });
});

describe("formatReadError", () => {
  it("flags the missing-RPC case with a setup hint", () => {
    const err = new Error("RPC_URL is not configured on the server.");
    expect(formatReadError(err)).toEqual({
      message: "RPC endpoint is not configured on the server.",
      setupHint: true,
    });
  });

  it("prefers viem's shortMessage when present", () => {
    const err = {
      shortMessage: "Insufficient funds.",
      message: "long stack...\nmore lines",
    };
    expect(formatReadError(err)).toEqual({
      message: "Insufficient funds.",
      setupHint: false,
    });
  });

  it("falls back to the first line of the raw message", () => {
    const err = new Error("first line\nsecond line\nthird line");
    expect(formatReadError(err)).toEqual({
      message: "first line",
      setupHint: false,
    });
  });

  it("handles non-Error values", () => {
    expect(formatReadError("plain string")).toEqual({
      message: "plain string",
      setupHint: false,
    });
  });
});

describe("Section", () => {
  it("renders the title with the // prefix and its children", () => {
    render(
      <Section title="hello">
        <p>body</p>
      </Section>,
    );
    expect(
      screen.getByRole("heading", { level: 2 }),
    ).toHaveTextContent("// hello");
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("renders label and value", () => {
    render(<Field label="owner" value="0xabc" />);
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("0xabc")).toBeInTheDocument();
  });

  it("applies break-all when wrap is set", () => {
    const { container } = render(
      <Field label="hash" value="0xdeadbeef" wrap />,
    );
    expect(container.querySelector("dd")).toHaveClass("break-all");
  });

  it("forwards an extra className", () => {
    const { container } = render(
      <Field label="x" value="y" className="my-extra" />,
    );
    expect(container.firstChild).toHaveClass("my-extra");
  });
});

describe("RpcError", () => {
  it("renders the formatted message and a setup link when RPC_URL is missing", () => {
    render(<RpcError error={new Error("RPC_URL is not configured")} />);
    expect(
      screen.getByText(/RPC endpoint is not configured/i),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "/docs" });
    expect(link).toHaveAttribute("href", "/docs");
  });

  it("omits the setup link for non-RPC errors", () => {
    render(<RpcError error={new Error("something broke")} />);
    expect(screen.getByText("something broke")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "/docs" })).toBeNull();
  });
});

describe("ActionCard", () => {
  function makeClient(
    overrides: Partial<PublicClient> = {},
  ): PublicClient {
    return {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
      ...overrides,
    } as unknown as PublicClient;
  }

  it("blocks submission and shows the validation error", async () => {
    const run = vi.fn();
    render(
      <ActionCard
        title="bid"
        submitLabel="bid"
        accent="bid"
        validate={() => "enter a price"}
        run={run as unknown as () => Promise<`0x${string}`>}
        client={makeClient()}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "bid" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("enter a price")).toBeInTheDocument();
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("submits, awaits the receipt, then calls onDone on success", async () => {
    const onDone = vi.fn();
    const waitFor_ = vi.fn().mockResolvedValue({ status: "success" });
    const client = makeClient({
      waitForTransactionReceipt: waitFor_,
    } as Partial<PublicClient>);
    const hash = "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" as const;
    render(
      <ActionCard
        title="confirm"
        submitLabel="go"
        accent="transfer"
        run={async () => hash}
        onDone={onDone}
        client={client}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "go" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/confirmed/)).toBeInTheDocument();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(waitFor_).toHaveBeenCalledWith({ hash });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `https://etherscan.io/tx/${hash}`);
  });

  it("shows a reverted label when the receipt reports failure", async () => {
    const onDone = vi.fn();
    const client = makeClient({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "reverted" }),
    } as Partial<PublicClient>);
    render(
      <ActionCard
        title="x"
        submitLabel="x"
        accent="sold"
        run={async () =>
          "0x0000000000000000000000000000000000000000000000000000000000000001" as const
        }
        onDone={onDone}
        client={client}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "x" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/reverted/)).toBeInTheDocument();
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it("renders the formatted error when run() rejects", async () => {
    const client = makeClient();
    render(
      <ActionCard
        title="x"
        submitLabel="x"
        accent="sold"
        run={async () => {
          throw new Error("user rejected");
        }}
        client={client}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "x" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("user rejected")).toBeInTheDocument();
    });
  });

  it("renders a description and is disabled when disabled prop is true", () => {
    render(
      <ActionCard
        title="x"
        description="explain"
        submitLabel="x"
        accent="offer"
        run={async () =>
          "0x0000000000000000000000000000000000000000000000000000000000000001" as const
        }
        disabled
        client={makeClient()}
      />,
    );
    expect(screen.getByText("explain")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "x" })).toBeDisabled();
  });
});
