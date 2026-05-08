import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const makeReadClientMock = vi.fn();
const useWalletMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

import Home from "@/app/page";

beforeEach(() => {
  pushMock.mockReset();
  makeReadClientMock.mockReset();
  useWalletMock.mockReset();
  useWalletMock.mockReturnValue({ account: null });
  makeReadClientMock.mockReturnValue({
    getEnsAddress: vi.fn(),
  });
});

describe("Home — punk search", () => {
  it("navigates to /punk/<n> for a valid index", () => {
    render(<Home />);
    const input = screen.getByPlaceholderText(/punk index/i);
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.submit(input.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/punk/42");
  });

  it("shows an error and does not navigate when the index is out of range", () => {
    render(<Home />);
    const input = screen.getByPlaceholderText(/punk index/i);
    fireEvent.change(input, { target: { value: "99999" } });
    fireEvent.submit(input.closest("form")!);
    expect(
      screen.getByText(/punk index must be an integer/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("Home — address search", () => {
  it("navigates directly when input is a 0x address", () => {
    render(<Home />);
    const inputs = screen.getAllByRole("textbox");
    const addressInput = inputs[inputs.length - 1];
    fireEvent.change(addressInput, {
      target: { value: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB" },
    });
    fireEvent.submit(addressInput.closest("form")!);
    expect(pushMock).toHaveBeenCalledWith(
      "/address/0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    );
  });

  it("rejects non-hex non-ENS input with a clear error", () => {
    render(<Home />);
    const inputs = screen.getAllByRole("textbox");
    const addressInput = inputs[inputs.length - 1];
    fireEvent.change(addressInput, {
      target: { value: "not-an-address" },
    });
    fireEvent.submit(addressInput.closest("form")!);
    expect(
      screen.getByText(/enter a 0x address or an ENS name/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("resolves ENS names via getEnsAddress and navigates to the resolved address", async () => {
    const getEnsAddress = vi
      .fn()
      .mockResolvedValue("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB");
    makeReadClientMock.mockReturnValue({ getEnsAddress });
    render(<Home />);
    const inputs = screen.getAllByRole("textbox");
    const addressInput = inputs[inputs.length - 1];
    fireEvent.change(addressInput, { target: { value: "vitalik.eth" } });
    fireEvent.submit(addressInput.closest("form")!);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/address/0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
      );
    });
    expect(getEnsAddress).toHaveBeenCalledWith({ name: "vitalik.eth" });
  });

  it("shows a 'no address found' error when ENS resolution returns null", async () => {
    makeReadClientMock.mockReturnValue({
      getEnsAddress: vi.fn().mockResolvedValue(null),
    });
    render(<Home />);
    const inputs = screen.getAllByRole("textbox");
    const addressInput = inputs[inputs.length - 1];
    fireEvent.change(addressInput, { target: { value: "missing.eth" } });
    fireEvent.submit(addressInput.closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText(/no address found for missing\.eth/i),
      ).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders a 'use mine' shortcut for the connected account", () => {
    useWalletMock.mockReturnValue({
      account: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    });
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /use mine/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/address/0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    );
  });

  it("shows the first line of an unexpected ENS error", async () => {
    makeReadClientMock.mockReturnValue({
      getEnsAddress: vi
        .fn()
        .mockRejectedValue(new Error("ens lookup failed\nstack trace")),
    });
    render(<Home />);
    const inputs = screen.getAllByRole("textbox");
    const addressInput = inputs[inputs.length - 1];
    fireEvent.change(addressInput, { target: { value: "valid.eth" } });
    fireEvent.submit(addressInput.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("ens lookup failed")).toBeInTheDocument();
    });
  });
});
