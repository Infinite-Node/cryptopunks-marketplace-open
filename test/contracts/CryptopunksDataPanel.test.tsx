import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeReadClientMock = vi.fn();

vi.mock("@/app/lib/cryptopunks", async (importActual) => {
  const actual =
    await importActual<typeof import("@/app/lib/cryptopunks")>();
  return {
    ...actual,
    makeReadClient: () => makeReadClientMock(),
  };
});

import { CryptopunksDataPanel } from "@/app/contracts/CryptopunksDataPanel";

beforeEach(() => {
  makeReadClientMock.mockReset();
});

function clientFromReads(svg: string, attrs: string) {
  return {
    readContract: vi.fn(({ functionName }: { functionName: string }) => {
      if (functionName === "punkImageSvg") return Promise.resolve(svg);
      if (functionName === "punkAttributes") return Promise.resolve(attrs);
      return Promise.reject(new Error(`unmocked: ${functionName}`));
    }),
  };
}

describe("CryptopunksDataPanel", () => {
  it("rejects non-numeric input with a clear validation error", () => {
    makeReadClientMock.mockReturnValue(clientFromReads("", ""));
    render(<CryptopunksDataPanel />);
    fireEvent.change(screen.getByPlaceholderText(/punk index/i), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(
      screen.getByText(/must be a whole number between 0 and 9999/i),
    ).toBeInTheDocument();
  });

  it("rejects out-of-range indices", () => {
    makeReadClientMock.mockReturnValue(clientFromReads("", ""));
    render(<CryptopunksDataPanel />);
    fireEvent.change(screen.getByPlaceholderText(/punk index/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(
      screen.getByText(/must be between 0 and 9999/i),
    ).toBeInTheDocument();
  });

  it("ignores empty submissions", () => {
    const client = clientFromReads("", "");
    makeReadClientMock.mockReturnValue(client);
    render(<CryptopunksDataPanel />);
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it("fetches and renders the SVG and decoded attribute list", async () => {
    makeReadClientMock.mockReturnValue(
      clientFromReads(
        'data:image/svg+xml;utf8,<svg id="punk0" />',
        "Male, Big Shades, Mole",
      ),
    );
    const { container } = render(<CryptopunksDataPanel />);
    fireEvent.change(screen.getByPlaceholderText(/punk index/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("punk #0")).toBeInTheDocument();
    });
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Big Shades")).toBeInTheDocument();
    expect(screen.getByText("Mole")).toBeInTheDocument();
    expect(container.querySelector('svg[id="punk0"]')).toBeTruthy();
  });

  it("renders the first line of an unexpected error", async () => {
    makeReadClientMock.mockReturnValue({
      readContract: vi
        .fn()
        .mockRejectedValue(new Error("contract revert\nlong stack")),
    });
    render(<CryptopunksDataPanel />);
    fireEvent.change(screen.getByPlaceholderText(/punk index/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText("contract revert")).toBeInTheDocument();
    });
  });
});
