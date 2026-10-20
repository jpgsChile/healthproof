import { expect, it, vi } from "vitest";
import { EXCHANGE_ROUTES } from "@/components/landing/anatomy/exchange";
import {
  createHeroDemoState,
  heroDemoReducer,
} from "@/components/landing/demo/hero-demo-flow";
import { useHeroPathAnimation } from "./useHeroPathAnimation";

const h = vi.hoisted(() => {
  const calls: (() => void)[] = [];
  const timeline = {
    to() {
      return this;
    },
    set() {
      return this;
    },
    call(fn: () => void) {
      calls.push(fn);
      return this;
    },
    paused() {
      return this;
    },
  };
  return {
    emptySelections: [] as object[],
    still: false,
    calls,
    timeline,
    enter: (_context: { conditions: { still: boolean } }): unknown => undefined,
  };
});
vi.mock("react", () => ({ useLayoutEffect: (fn: () => unknown) => fn() }));
vi.mock("gsap", () => ({
  default: {
    set(target: object | object[], values: object) {
      if ("length" in target && target.length === 0)
        h.emptySelections.push(target);
      for (const node of Array.isArray(target) ? target : [target])
        Object.assign(node, values);
    },
    timeline: () => h.timeline,
    matchMedia: () => ({
      add(_queries: unknown, fn: typeof h.enter) {
        h.enter = fn;
        fn({ conditions: { still: h.still } });
      },
      revert() {},
    }),
  },
}));

it("retains future parked outcomes on close and media reentry", () => {
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  try {
    const result = { autoAlpha: 1 },
      shared = { autoAlpha: 1 };
    const carrier = { querySelector: () => null };
    const scene = {
      dataset: {} as Record<string, string>,
      querySelector: (selector: string) =>
        selector === "[data-machine-result]"
          ? result
          : selector === "[data-machine-shared-access]"
            ? shared
            : selector.startsWith("[data-hero-parcel=")
              ? carrier
              : null,
      querySelectorAll: (selector: string) =>
        selector === "[data-machine-parked]" ? [result, shared] : [],
    };
    let state = heroDemoReducer(createHeroDemoState(), { type: "open" });
    for (let step = 0; step < 5; step++) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    const before = JSON.stringify(state);
    // biome-ignore lint/correctness/useHookAtTopLevel: finite harness replaces React's layout effect and invokes the public hook directly
    useHeroPathAnimation(
      { current: scene as unknown as HTMLDivElement },
      state,
      EXCHANGE_ROUTES,
    );
    h.calls[0]();
    expect(scene.dataset.movingRoute).toBe("order");
    expect([result.autoAlpha, shared.autoAlpha]).toEqual([1, 1]);
    h.enter({ conditions: { still: true } });
    h.enter({ conditions: { still: false } });
    expect([result.autoAlpha, shared.autoAlpha]).toEqual([1, 1]);
    expect(JSON.stringify(state)).toBe(before);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("does not send empty parked NodeLists to GSAP on initial render or media reentry", () => {
  h.emptySelections.length = 0;
  const emptyParked = { length: 0, *[Symbol.iterator]() {} };
  const parcel = {};
  const scene = {
    querySelector: () => null,
    querySelectorAll: (selector: string) =>
      selector === "[data-machine-parked]"
        ? emptyParked
        : selector === "[data-hero-parcel]"
          ? [parcel]
          : [],
  };
  // Reduced motion exercises initialization without a DOM or animation scheduler.
  const enter = h.enter;
  h.still = true;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: finite harness replaces React's layout effect and invokes the public hook directly
    useHeroPathAnimation(
      { current: scene as unknown as HTMLDivElement },
      createHeroDemoState(),
      EXCHANGE_ROUTES,
    );
    h.enter({ conditions: { still: true } });
    expect(h.emptySelections).toEqual([]);
    expect(parcel).toEqual({ autoAlpha: 0 });
  } finally {
    h.still = false;
    h.enter = enter;
  }
});
