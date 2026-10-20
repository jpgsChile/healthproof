import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createHeroDemoState, heroDemoReducer } from "./demo/hero-demo-flow";
import { HeroDataScene } from "./HeroDataScene";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) =>
    createElement("img", props),
}));

describe("hero data scene", () => {
  it("keeps a protected file visible when closing before simulated delivery", () => {
    let state = heroDemoReducer(createHeroDemoState(), { type: "open" });
    for (const step of [0, 1]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "encrypted",
    });
    state = heroDemoReducer(state, { type: "close" });
    const html = renderToStaticMarkup(
      createElement(HeroDataScene, { state, onOpenDemo: vi.fn() }),
    );
    expect(html.includes("fileProtected")).toBe(true);
    expect(html.includes('data-machine-stationary-document=""')).toBe(true);
    expect(html.includes('data-result-available="false"')).toBe(true);
  });

  it("keeps granted access visible after leaving the permission step", () => {
    let state = heroDemoReducer(createHeroDemoState(), { type: "open" });
    for (const step of [0, 1]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    const html = renderToStaticMarkup(
      createElement(HeroDataScene, { state, onOpenDemo: vi.fn() }),
    );
    expect(html.includes('aria-label="stageProgress"')).toBe(true);
    expect(html.includes("permissionGranted")).toBe(true);
    expect(html.includes('data-access-granted="true"')).toBe(true);
  });

  it("retains all three actors and exposes the demo without a separate modal trigger", () => {
    const html = renderToStaticMarkup(
      createElement(HeroDataScene, {
        state: createHeroDemoState(),
        onOpenDemo: vi.fn(),
      }),
    );
    for (const image of ["medical-center", "laboratory", "patient"]) {
      expect(html.includes(`/images/hero/${image}.png`)).toBe(true);
    }
    expect(html.includes('aria-controls="hero-demo-panel"')).toBe(true);
    expect(html.includes("<output")).toBe(true);
  });

  it("announces the completed action rather than an unrelated timed phase", () => {
    const opened = heroDemoReducer(createHeroDemoState(), { type: "open" });
    const state = heroDemoReducer(opened, { type: "complete", step: 0 });
    const html = renderToStaticMarkup(
      createElement(HeroDataScene, { state, onOpenDemo: vi.fn() }),
    );
    expect(html.includes("orderCreated")).toBe(true);
    expect(html.includes('data-phase="order-created"')).toBe(true);
    expect(html.includes('aria-expanded="true"')).toBe(true);
  });
});
