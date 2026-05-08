import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));
vi.mock("@/app/contracts/CryptopunksDataPanel", () => ({
  CryptopunksDataPanel: () => <div data-testid="data-panel" />,
}));
vi.mock("@/app/contracts/ProcessPunkBidPanel", () => ({
  ProcessPunkBidPanel: () => <div data-testid="bid-panel" />,
}));
vi.mock("@/app/contracts/StashFactoryPanel", () => ({
  StashFactoryPanel: () => <div data-testid="factory-panel" />,
}));

import ContractsPage, { metadata } from "@/app/contracts/page";

describe("/contracts", () => {
  it("renders all 6 contract cards with their addresses or notes", () => {
    render(<ContractsPage />);
    expect(
      screen.getByRole("heading", { name: /CryptoPunksMarket/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /CryptopunksData/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /WrappedPunks .* legacy/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /CryptoPunks721/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /StashFactory/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /■ Stash$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/per-owner address/i),
    ).toBeInTheDocument();
  });

  it("renders the three interactive panels", () => {
    render(<ContractsPage />);
    expect(screen.getByTestId("data-panel")).toBeInTheDocument();
    expect(screen.getByTestId("bid-panel")).toBeInTheDocument();
    expect(screen.getByTestId("factory-panel")).toBeInTheDocument();
  });

  it("renders function signatures with descriptions inside the disclosure", () => {
    render(<ContractsPage />);
    // "balanceOf" is a documented function on CryptoPunksMarket
    const codes = screen.getAllByText(/balanceOf/, { selector: "code" });
    expect(codes.length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Number of Punks held by an address/i).length,
    ).toBeGreaterThan(0);
  });

  it("marks payable functions with [payable]", () => {
    render(<ContractsPage />);
    expect(screen.getAllByText(/\[payable\]/).length).toBeGreaterThan(0);
  });

  it("exports a contracts-flavored metadata title", () => {
    expect(metadata.title).toMatch(/contracts/i);
  });
});
