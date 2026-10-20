import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DemoSummary } from "./demo/DemoSummary";
import { TimelineStep } from "./demo/TimelineStep";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui", () => ({
  Button: ({ children, ...props }: ComponentProps<"button">) =>
    createElement("button", { ...props, type: "button" }, children),
}));

describe("hero completion", () => {
  it("keeps completion in a labelled non-modal panel with reachable close controls", () => {
    const html = renderToStaticMarkup(
      createElement(DemoSummary, { onClose: vi.fn() }),
    );
    expect(html.includes('role="dialog"')).toBe(false);
    expect(html.includes('aria-modal="true"')).toBe(false);
    expect(html.includes('id="hero-demo-summary"')).toBe(true);
    expect(html.includes('aria-labelledby="hero-summary-title"')).toBe(true);
    expect(html.includes("hero-demo-panel-footer")).toBe(true);
  });

  it("keeps full traceability metadata available but collapsed by default", () => {
    const html = renderToStaticMarkup(
      createElement(TimelineStep, { onComplete: vi.fn() }),
    );
    expect(html.match(/<details/g)?.length).toBe(4);
    expect(html.includes("<details open")).toBe(false);
    expect(html.match(/eventDetails/g)?.length).toBe(4);
    expect(html.includes("txHashLabel")).toBe(true);
    expect(html.includes("blockLabel")).toBe(true);
  });
});
