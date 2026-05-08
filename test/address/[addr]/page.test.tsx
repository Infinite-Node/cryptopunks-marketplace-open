import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolved } from "@/test/utils/resolved";

const replaceMock = vi.fn();
const makeReadClientMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/app/lib/cryptopunks", async (importActual) => {
  const actual =
    await importActual<typeof import("@/app/lib/cryptopunks")>();
  return {
    ...actual,
    makeReadClient: () => makeReadClientMock(),
  };
});

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));
vi.mock("@/app/components/AddressView", () => ({
  AddressView: ({ addr }: { addr: string }) => (
    <div data-testid="address-view">{addr}</div>
  ),
}));

import AddressPage from "@/app/address/[addr]/page";

function renderPage(addr: string) {
  return render(<AddressPage params={resolved({ addr })} />);
}

beforeEach(() => {
  replaceMock.mockReset();
  makeReadClientMock.mockReset();
  makeReadClientMock.mockReturnValue({ getEnsAddress: vi.fn() });
});

describe("/address/[addr]", () => {
  it("renders AddressView for a valid 0x address (checksummed)", () => {
    renderPage("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB");
    expect(screen.getByTestId("address-view")).toHaveTextContent(
      "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    );
  });

  it("shows the invalid-address error for non-hex non-ENS input", () => {
    renderPage("definitely-not-an-address");
    expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    expect(screen.queryByTestId("address-view")).toBeNull();
  });

  it("shows the invalid-address error for too-short hex", () => {
    renderPage("0xabc");
    expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
  });

  it("resolves an ENS name and replaces the URL with the canonical 0x address", async () => {
    const getEnsAddress = vi
      .fn()
      .mockResolvedValue("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB");
    makeReadClientMock.mockReturnValue({ getEnsAddress });
    renderPage("vitalik.eth");
    expect(screen.getByText(/resolving vitalik\.eth/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/address/0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
      );
    });
    expect(getEnsAddress).toHaveBeenCalledWith({ name: "vitalik.eth" });
  });

  it("shows 'no address found' when ENS resolution returns null", async () => {
    makeReadClientMock.mockReturnValue({
      getEnsAddress: vi.fn().mockResolvedValue(null),
    });
    renderPage("missing.eth");
    await waitFor(() => {
      expect(
        screen.getByText(/no address found for missing\.eth/i),
      ).toBeInTheDocument();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows the first line of an unexpected ENS error", async () => {
    makeReadClientMock.mockReturnValue({
      getEnsAddress: vi
        .fn()
        .mockRejectedValue(new Error("ens lookup failed\nstack trace")),
    });
    renderPage("valid.eth");
    await waitFor(() => {
      expect(screen.getByText("ens lookup failed")).toBeInTheDocument();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
