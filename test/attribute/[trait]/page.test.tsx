import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { resolved } from "@/test/utils/resolved";

vi.mock("@/app/components/SiteChrome", () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));
vi.mock("@/app/components/AttributeView", () => ({
  AttributeView: ({ trait }: { trait: string }) => (
    <div data-testid="attribute-view">{trait}</div>
  ),
}));

import AttributePage from "@/app/attribute/[trait]/page";

function renderPage(trait: string) {
  return render(<AttributePage params={resolved({ trait })} />);
}

describe("/attribute/[trait]", () => {
  it("decodes URL-encoded trait names before passing to AttributeView", () => {
    renderPage(encodeURIComponent("Big Shades"));
    expect(screen.getByTestId("attribute-view")).toHaveTextContent("Big Shades");
  });

  it("passes plain traits through unchanged", () => {
    renderPage("Female");
    expect(screen.getByTestId("attribute-view")).toHaveTextContent("Female");
  });
});
