import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { resolved } from "@/test/utils/resolved";

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));
vi.mock("@/app/components/PunkView", () => ({
  PunkView: ({ index }: { index: number }) => (
    <div data-testid="punk-view">{index}</div>
  ),
}));

import PunkPage from "@/app/punk/[id]/page";

function renderPage(id: string) {
  return render(<PunkPage params={resolved({ id })} />);
}

describe("/punk/[id]", () => {
  it("renders PunkView for a valid id in [0, 9999]", () => {
    renderPage("42");
    expect(screen.getByTestId("punk-view")).toHaveTextContent("42");
  });

  it("renders the invalid-index error for negative numbers", () => {
    renderPage("-1");
    expect(screen.getByText(/invalid punk index/i)).toBeInTheDocument();
  });

  it("renders the invalid-index error for ids above 9999", () => {
    renderPage("10000");
    expect(screen.getByText(/invalid punk index/i)).toBeInTheDocument();
  });

  it("renders the invalid-index error for non-integer input", () => {
    renderPage("notanumber");
    expect(screen.getByText(/invalid punk index/i)).toBeInTheDocument();
  });
});
