import { describe, expect, it } from "vitest";
import {
  createHeroDemoState,
  getHeroFeedback,
  getHeroScene,
  heroDemoReducer,
} from "./hero-demo-flow";

const open = () => heroDemoReducer(createHeroDemoState(), { type: "open" });

describe("hero demo flow", () => {
  it("re-arms order confirmation after editing without erasing history or weakening deduplication", () => {
    const completed = heroDemoReducer(open(), { type: "complete", step: 0 });
    expect(heroDemoReducer(completed, { type: "complete", step: 0 })).toBe(
      completed,
    );
    const edited = heroDemoReducer(completed, {
      type: "phase",
      step: 0,
      phase: "order",
    });
    expect(edited.completed[0]).toBe(true);
    expect(edited.phase).toBe("order");
    expect(getHeroScene(edited).route).toBeNull();
    expect(edited.revision).toBe(completed.revision + 1);
    const confirmed = heroDemoReducer(edited, { type: "complete", step: 0 });
    expect(getHeroScene(confirmed).route).toBe("order");
    expect(heroDemoReducer(confirmed, { type: "complete", step: 0 })).toBe(
      confirmed,
    );
    expect(
      heroDemoReducer(confirmed, { type: "phase", step: 1, phase: "order" }),
    ).toBe(confirmed);
  });
  it("retains previous access when a repeated authorization is cancelled", () => {
    let state = open();
    for (const step of [0, 1]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, { type: "back" });
    state = heroDemoReducer(state, {
      type: "phase",
      step: 1,
      phase: "permission-pending",
    });
    expect(getHeroFeedback(state).permissionGranted).toBe(false);
    state = heroDemoReducer(state, { type: "close" });
    expect(getHeroFeedback(state).permissionGranted).toBe(true);
    state = heroDemoReducer(state, { type: "open" });
    expect(getHeroFeedback(state).permissionGranted).toBe(false);
  });

  it("shows fresh file preparation without erasing completed navigation history", () => {
    let state = open();
    for (const step of [0, 1, 2]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, { type: "back" });
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "file-selected",
    });
    expect(state.milestones.fileReceived).toBe(false);
    expect(state.milestones.fileEncrypted).toBe(false);
    expect(state.completed[2]).toBe(true);
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "file-received",
    });
    expect(getHeroFeedback(state).fileReceived).toBe(true);
    expect(getHeroFeedback(state).fileEncrypted).toBe(false);
  });

  it("distinguishes authorization in progress from access already granted", () => {
    let state = heroDemoReducer(open(), { type: "complete", step: 0 });
    state = heroDemoReducer(state, { type: "next" });
    state = heroDemoReducer(state, {
      type: "phase",
      step: 1,
      phase: "permission-pending",
    });
    expect(state.phase).toBe("permission-pending");
    expect(state.completed[1]).toBe(false);
    expect(getHeroScene(state).route).toBeNull();
    state = heroDemoReducer(state, { type: "complete", step: 1 });
    expect(state.phase).toBe("lab-assigned");
    expect(state.completed[1]).toBe(true);
  });

  it("records laboratory selection and intake before encryption or delivery", () => {
    let state = open();
    for (const step of [0, 1]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "file-selected",
    });
    expect(state.phase).toBe("file-selected");
    expect(state.milestones.fileSelected).toBe(true);
    expect(state.milestones.fileReceived).toBe(false);
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "file-received",
    });
    expect(state.phase).toBe("file-received");
    expect(state.milestones.fileReceived).toBe(true);
    expect(state.milestones.fileEncrypted).toBe(false);
    expect(state.completed[2]).toBe(false);
    expect(getHeroScene(state).route).toBeNull();
    const before = JSON.stringify(state);
    expect(
      heroDemoReducer(state, {
        type: "phase",
        step: 1,
        phase: "permission-pending",
      }),
    ).toBe(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("retains completed milestones across navigation and resets them for a new demo", () => {
    let state = open();
    for (const step of [0, 1, 2]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    expect(state.milestones.fileEncrypted).toBe(true);
    state = heroDemoReducer(state, { type: "back" });
    expect(state.completed.slice(0, 3)).toEqual([true, true, true]);
    expect(state.milestones.fileReceived).toBe(true);
    expect(state.milestones.fileEncrypted).toBe(true);
    state = heroDemoReducer(state, { type: "close" });
    state = heroDemoReducer(state, { type: "open" });
    expect(Object.values(state.milestones).every((value) => !value)).toBe(true);
  });

  it("reflects a new confirmation after revisiting a completed step", () => {
    const routes = ["order", "assignment", "result", "sharing"];
    for (let target = 0; target < routes.length; target++) {
      let state = open();
      for (let step = 0; step <= target; step++) {
        state = heroDemoReducer(state, { type: "complete", step });
        state = heroDemoReducer(state, { type: "next" });
      }
      state = heroDemoReducer(state, { type: "back" });
      expect(getHeroScene(state).route).toBeNull();
      if (target === 2) {
        state = heroDemoReducer(state, {
          type: "phase",
          step: target,
          phase: "encrypting",
        });
        state = heroDemoReducer(state, {
          type: "phase",
          step: target,
          phase: "encrypted",
        });
      }
      const confirmed = heroDemoReducer(state, {
        type: "complete",
        step: target,
      });
      expect(getHeroScene(confirmed).route).toBe(routes[target]);
      expect(
        heroDemoReducer(confirmed, { type: "complete", step: target }),
      ).toBe(confirmed);
    }
  });

  it("waits for the existing step's action before enabling the next step", () => {
    const state = open();
    expect(heroDemoReducer(state, { type: "next" })).toBe(state);
    const completed = heroDemoReducer(state, { type: "complete", step: 0 });
    expect(getHeroScene(completed).route).toBe("order");
    expect(heroDemoReducer(completed, { type: "next" }).step).toBe(1);
  });

  it("sends each completed action along the correct actor-to-actor route", () => {
    let state = open();
    for (const [step, route] of [
      "order",
      "assignment",
      "result",
      "sharing",
      null,
    ].entries()) {
      state = heroDemoReducer(state, { type: "complete", step });
      expect(getHeroScene(state).route).toBe(route);
      expect(state.completed[step]).toBe(true);
      if (step < 4) state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, { type: "next" });
    expect(state.isOpen).toBe(false);
    expect(state.hasFinished).toBe(true);
  });

  it("does not fabricate a transfer when navigating back or opening a step", () => {
    let state = heroDemoReducer(open(), { type: "complete", step: 0 });
    state = heroDemoReducer(state, { type: "next" });
    expect(getHeroScene(state).route).toBeNull();
    state = heroDemoReducer(state, { type: "back" });
    expect(state.step).toBe(0);
    expect(state.completed[0]).toBe(true);
    expect(getHeroScene(state).route).toBeNull();
  });

  it("keeps repeated completion and stale callbacks from replaying transfers", () => {
    const state = heroDemoReducer(open(), { type: "complete", step: 0 });
    expect(heroDemoReducer(state, { type: "complete", step: 0 })).toBe(state);
    expect(heroDemoReducer(state, { type: "complete", step: 2 })).toBe(state);
    expect(
      heroDemoReducer(state, { type: "phase", step: 2, phase: "encrypting" }),
    ).toBe(state);
    expect(heroDemoReducer(state, { type: "open" })).toBe(state);
  });

  it("shows encryption at the laboratory without inventing a data transfer", () => {
    let state = open();
    for (const step of [0, 1]) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "encrypting",
    });
    expect(getHeroScene(state)).toMatchObject({
      actor: "laboratory",
      route: null,
    });
    expect(state.completed[2]).toBe(false);
    state = heroDemoReducer(state, {
      type: "phase",
      step: 2,
      phase: "encrypted",
    });
    expect(getHeroScene(state).route).toBeNull();
    state = heroDemoReducer(state, { type: "complete", step: 2 });
    expect(getHeroScene(state).route).toBe("result");
  });

  it("closes without completing, ignores late callbacks and reopens a fresh demo", () => {
    const closed = heroDemoReducer(open(), { type: "close" });
    expect(closed.hasFinished).toBe(false);
    expect(heroDemoReducer(closed, { type: "complete", step: 0 })).toBe(closed);
    const reopened = heroDemoReducer(closed, { type: "open" });
    expect(reopened.step).toBe(0);
    expect(reopened.completed).toEqual([false, false, false, false, false]);
    expect(heroDemoReducer(reopened, { type: "back" }).isOpen).toBe(false);
  });
});
