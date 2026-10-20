import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createHeroDemoState, heroDemoReducer } from "./demo/hero-demo-flow";
import { HeroDemoPanel } from "./HeroDemoPanel";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/components/ui", () => ({
  Button: ({ children, ...props }: ComponentProps<"button">) =>
    createElement("button", { ...props, type: "button" }, children),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("guided hero demo presentation", () => {
  it.each([
    [0, "createOrder"],
    [1, "authorizeLab"],
    [2, "prepareUpload"],
    [3, "viewResult"],
    [4, "finishDemo"],
  ])(
    "renders one meaningful primary for step %s before effects",
    (step, label) => {
      const state = { ...createHeroDemoState(), isOpen: true, step };
      const html = renderToStaticMarkup(
        createElement(HeroDemoPanel, {
          state,
          onAction: vi.fn(),
          onClose: vi.fn(),
          onFinish: vi.fn(),
        }),
      );
      expect(html.match(/data-demo-primary="true"/g)).toHaveLength(1);
      expect(html).toMatch(
        new RegExp(`id="hero-demo-primary"[^>]*>${label}</button>`),
      );
      const body = html
        .split("hero-demo-panel-body")[1]
        .split("hero-demo-panel-footer")[0];
      expect(body).not.toMatch(
        />(createOrder|assignLab|uploadAction|encryptButton|viewResult|shareAction)<\/button>/,
      );
    },
  );
  it("keeps the rest of the hero available instead of creating a modal", () => {
    const html = renderToStaticMarkup(
      createElement(HeroDemoPanel, {
        state: heroDemoReducer(createHeroDemoState(), { type: "open" }),
        onAction: vi.fn(),
        onClose: vi.fn(),
        onFinish: vi.fn(),
      }),
    );

    expect(html.includes('role="dialog"')).toBe(false);
    expect(html.includes('aria-modal="true"')).toBe(false);
    expect(html).toContain('aria-labelledby="hero-demo-title"');
    expect(html).toContain('id="hero-demo-panel"');
  });
});
