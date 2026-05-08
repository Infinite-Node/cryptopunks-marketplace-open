import { render, screen, waitFor } from "@testing-library/react";
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

import { AttributeView } from "@/app/components/AttributeView";
import { cacheKeys } from "@/app/lib/storage";

function makeClient(overrides: { multicall?: ReturnType<typeof vi.fn> } = {}) {
  return {
    multicall: overrides.multicall ?? vi.fn(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  makeReadClientMock.mockReset();
});

describe("AttributeView", () => {
  it("renders the cached SVG grid for matching punks without hitting the network", async () => {
    const allAttrs = new Array(10000).fill("");
    allAttrs[0] = "Male, Big Shades";
    allAttrs[7] = "Female, Big Shades";
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.allAttrs()}`,
      JSON.stringify(allAttrs),
    );
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.punkSvg(0)}`,
      JSON.stringify('data:image/svg+xml;utf8,<svg id="p0" />'),
    );
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.punkSvg(7)}`,
      JSON.stringify('data:image/svg+xml;utf8,<svg id="p7" />'),
    );

    const multicall = vi.fn();
    makeReadClientMock.mockReturnValue(makeClient({ multicall }));

    render(<AttributeView trait="Big Shades" />);

    await waitFor(() => {
      expect(screen.getByText("(2 punks)")).toBeInTheDocument();
    });
    expect(multicall).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Punk #0/ })).toHaveAttribute(
      "href",
      "/punk/0",
    );
    expect(screen.getByRole("link", { name: /Punk #7/ })).toHaveAttribute(
      "href",
      "/punk/7",
    );
  });

  it("fetches attrs and SVGs via multicall when nothing is cached", async () => {
    const attrs = new Array(10000).fill("");
    attrs[3] = "Female, Mole";
    const attrResults = attrs.map((s) => ({
      status: "success" as const,
      result: s,
    }));
    const svgResults = [
      {
        status: "success" as const,
        result: 'data:image/svg+xml;utf8,<svg id="p3" />',
      },
    ];
    const multicall = vi
      .fn()
      .mockResolvedValueOnce(attrResults)
      .mockResolvedValueOnce(svgResults);
    makeReadClientMock.mockReturnValue(makeClient({ multicall }));

    render(<AttributeView trait="mole" />);

    await waitFor(() => {
      expect(screen.getByText("(1 punk)")).toBeInTheDocument();
    });
    expect(multicall).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("link", { name: /Punk #3/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(`punks-cache:v1:attrs:all`)).toBeTruthy();
  });

  it("renders the empty state when no punks match", async () => {
    const allAttrs = new Array(10000).fill("Female");
    window.localStorage.setItem(
      `punks-cache:v1:${cacheKeys.allAttrs()}`,
      JSON.stringify(allAttrs),
    );
    makeReadClientMock.mockReturnValue(makeClient({ multicall: vi.fn() }));

    render(<AttributeView trait="alien" />);

    await waitFor(() => {
      expect(screen.getByText(/no punks have this attribute/i)).toBeInTheDocument();
    });
  });

  it("renders the RPC error UI when multicall rejects", async () => {
    const multicall = vi
      .fn()
      .mockRejectedValueOnce(new Error("RPC_URL is not configured"));
    makeReadClientMock.mockReturnValue(makeClient({ multicall }));

    render(<AttributeView trait="ape" />);

    await waitFor(() => {
      expect(
        screen.getByText(/RPC endpoint is not configured/i),
      ).toBeInTheDocument();
    });
  });
});
