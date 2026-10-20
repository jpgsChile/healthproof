import { describe, expect, it } from "vitest";
import {
  EXCHANGE_DURATION,
  EXCHANGE_PARTS,
  EXCHANGE_ROUTES,
  type ExchangeRoute,
  getExchangeFrame,
  getLaboratoryFrame,
  project,
  TERMINALS,
} from "./exchange";

describe("physical clinical exchange", () => {
  it("takes the sample file into the laboratory before moving it to the chamber", () => {
    expect(getLaboratoryFrame(1).position).toEqual(
      project(TERMINALS.laboratory.port),
    );
    expect(getLaboratoryFrame(0, true).position).toEqual(
      project(TERMINALS.laboratory.port),
    );
    expect(getLaboratoryFrame(1, true).position).toEqual(project([0, 0, 13]));
    expect(getLaboratoryFrame(1).position).not.toEqual(
      project(TERMINALS.patient.port),
    );
    for (const processing of [false, true]) {
      expect(getLaboratoryFrame(-1, processing)).toEqual(
        getLaboratoryFrame(0, processing),
      );
      expect(getLaboratoryFrame(2, processing)).toEqual(
        getLaboratoryFrame(1, processing),
      );
    }
  });
  it("keeps continuous quantities continuous at every stage boundary", () => {
    const snapshot = JSON.stringify(EXCHANGE_ROUTES);
    const boundaries = [
      0.18,
      0.4,
      1,
      1.3,
      1.55,
      1.9,
      1.95,
      2.2,
      2.35,
      3.2,
      3.6,
      3.9,
      EXCHANGE_DURATION,
    ];
    for (const route of EXCHANGE_ROUTES) {
      for (const time of boundaries) {
        const a = getExchangeFrame(route, time - 1e-7);
        const b = getExchangeFrame(route, time + 1e-7);
        expect(
          Math.hypot(
            a.position[0] - b.position[0],
            a.position[1] - b.position[1],
          ),
        ).toBeLessThan(0.001);
        for (const key of [
          "press",
          "sealOpacity",
          "sourceOpen",
          "receiverOpen",
          "opacity",
        ] as const) {
          expect(Math.abs(a[key] - b[key])).toBeLessThan(0.001);
        }
      }
    }
    expect(JSON.stringify(EXCHANGE_ROUTES)).toBe(snapshot);
  });

  it("builds attached parts with volume inside one fixed camera", () => {
    expect(EXCHANGE_PARTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(EXCHANGE_PARTS.map((part) => part.id)).size).toBe(
      EXCHANGE_PARTS.length,
    );
    for (const part of EXCHANGE_PARTS) {
      expect(part.paths.fill.length).toBeGreaterThan(0);
      expect(part.paths.shades).toHaveLength(4);
      expect(JSON.stringify(part)).not.toMatch(/NaN|Infinity/);
      expect(part.bounds[0]).toBeGreaterThanOrEqual(0);
      expect(part.bounds[1]).toBeGreaterThanOrEqual(0);
      expect(part.bounds[2]).toBeLessThanOrEqual(1000);
      expect(part.bounds[3]).toBeLessThanOrEqual(600);
    }
  });

  it("starts and finishes every route at an actual terminal socket", () => {
    for (const route of EXCHANGE_ROUTES) {
      expect(route.inbound[0]).toEqual(TERMINALS[route.from].port);
      expect(route.outbound.at(-1)).toEqual(TERMINALS[route.to].port);
      expect(route.inbound.at(-1)).toEqual(route.outbound[0]);
      expect(getExchangeFrame(route, 0).position).toEqual(
        project(TERMINALS[route.from].port),
      );
      expect(getExchangeFrame(route, EXCHANGE_DURATION).position).toEqual(
        project(TERMINALS[route.to].port),
      );
    }
  });

  it("coordinates preparation, chamber processing and receipt without a second demo state", () => {
    const result = EXCHANGE_ROUTES.find(
      (route) => route.id === "result",
    ) as ExchangeRoute;
    expect(getExchangeFrame(result, 0.2).stage).toBe("prepare");
    expect(getExchangeFrame(result, 1).stage).toBe("inbound");
    const chamber = getExchangeFrame(result, 1.9);
    expect(chamber.stage).toBe("release");
    expect(chamber.press).toBe(0);
    expect(chamber.position).toEqual(project([0, 0, 13]));
    expect(getExchangeFrame(result, 2.3).sealed).toBe(true);
    expect(getExchangeFrame(result, 3).stage).toBe("outbound");
    expect(getExchangeFrame(result, EXCHANGE_DURATION).stage).toBe("received");
    const order = EXCHANGE_ROUTES[0];
    expect(getExchangeFrame(order, 2.3).sealed).toBe(false);
  });

  it("keeps projected travel continuous and clamps boundary samples", () => {
    for (const route of EXCHANGE_ROUTES) {
      expect(getExchangeFrame(route, -1)).toEqual(getExchangeFrame(route, 0));
      expect(getExchangeFrame(route, 99)).toEqual(
        getExchangeFrame(route, EXCHANGE_DURATION),
      );
      let previous = getExchangeFrame(route, 0).position;
      let previousFrame = getExchangeFrame(route, 0);
      for (let time = 0.01; time < EXCHANGE_DURATION; time += 0.01) {
        const frame = getExchangeFrame(route, time);
        const next = frame.position;
        expect(
          Math.hypot(next[0] - previous[0], next[1] - previous[1]),
        ).toBeLessThan(15);
        for (const property of [
          "sourceOpen",
          "receiverOpen",
          "press",
          "sealOpacity",
        ] as const) {
          expect(
            Math.abs(frame[property] - previousFrame[property]),
          ).toBeLessThan(0.1);
        }
        previous = next;
        previousFrame = frame;
      }
    }
    expect(
      EXCHANGE_ROUTES.map((route) => [route.id, route.from, route.to]),
    ).toEqual([
      ["order", "medicalCenter", "patient"],
      ["assignment", "patient", "laboratory"],
      ["result", "laboratory", "patient"],
      ["sharing", "patient", "medicalCenter"],
    ]);
  });

  it("uses access credentials instead of encrypted documents for permission transfers", () => {
    for (const id of ["assignment", "sharing"]) {
      const route = EXCHANGE_ROUTES.find(
        (candidate) => candidate.id === id,
      ) as ExchangeRoute;
      expect(route.cargo).toBe("credential");
      expect(getExchangeFrame(route, 1.9).stage).toBe("authorize");
      expect(getExchangeFrame(route, 1.9).press).toBe(0);
      expect(getExchangeFrame(route, 2.3).sealOpacity).toBe(0);
    }
    const result = EXCHANGE_ROUTES.find(
      (route) => route.id === "result",
    ) as ExchangeRoute;
    expect(result.cargo).toBe("document");
    expect(getExchangeFrame(result, 0).sealed).toBe(true);
    expect(getExchangeFrame(result, 1).sealOpacity).toBe(1);
  });
});
