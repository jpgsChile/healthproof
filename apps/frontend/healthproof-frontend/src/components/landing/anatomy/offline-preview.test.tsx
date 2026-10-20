import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createHeroDemoState,
  getHeroFeedback,
  getHeroScene,
  heroDemoReducer,
} from "../demo/hero-demo-flow";
import { project, TERMINALS } from "./exchange";
import { HeroExchangeMachine } from "./HeroExchangeMachine";

interface ImagePipeline {
  png(): ImagePipeline;
  resize(width: number): ImagePipeline;
  toBuffer(): Promise<Buffer>;
  metadata(): Promise<{ width?: number; height?: number }>;
}
const requireLocal = createRequire(import.meta.url);
const requireNext = createRequire(requireLocal.resolve("next/package.json"));
const sharp = requireNext("sharp") as (input: Buffer) => ImagePipeline;

const actors = [
  {
    key: "medicalCenter",
    file: "medical-center",
    label: "Medical Center",
    width: 230,
    ratio: 1.35,
  },
  {
    key: "laboratory",
    file: "laboratory",
    label: "Laboratory",
    width: 230,
    ratio: 1.35,
  },
  {
    key: "patient",
    file: "patient",
    label: "Patient",
    width: 120,
    ratio: 0.68,
  },
] as const;

async function specimen(
  time: number,
  width: number,
  scenario?: "permission" | "intake" | "outcomes",
) {
  const font = width < 640 ? 10000 / width : 14;
  const images = await Promise.all(
    actors.map(async (actor) => {
      const png = await readFile(
        new URL(
          `../../../../public/images/hero/${actor.file}.png`,
          import.meta.url,
        ),
      );
      const [x, y] = project(TERMINALS[actor.key].anchor);
      const height = actor.width / actor.ratio;
      return `<image x="${x - actor.width / 2}" y="${y + 26 - font * 1.4 - height}" width="${actor.width}" height="${height}" href="data:image/png;base64,${png.toString("base64")}"/><text x="${x}" y="${y + 26}" text-anchor="middle" font-size="${font}" font-family="Arial" fill="#52647a">${actor.label}</text>`;
    }),
  );
  let state = heroDemoReducer(createHeroDemoState(), { type: "open" });
  if (scenario) {
    const lastStep = scenario === "outcomes" ? 3 : 1;
    for (let step = 0; step <= lastStep; step++) {
      state = heroDemoReducer(state, { type: "complete", step });
      state = heroDemoReducer(state, { type: "next" });
    }
    if (scenario === "intake") {
      state = heroDemoReducer(state, {
        type: "phase",
        step: 2,
        phase: "file-selected",
      });
      state = heroDemoReducer(state, {
        type: "phase",
        step: 2,
        phase: "file-received",
      });
    }
  }
  const rendered = renderToStaticMarkup(
    createElement(
      HeroExchangeMachine,
      scenario
        ? {
            phase: state.phase,
            activeRoute: getHeroScene(state).route,
            feedback: getHeroFeedback(state),
          }
        : {
            phase: "tour",
            activeRoute: "result",
            frame: { route: "result", time },
          },
    ),
  );
  return rendered
    .replace(
      "<svg ",
      '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" ',
    )
    .replace("</svg>", `${images.join("")}</svg>`);
}

describe("offline exchange specimen", () => {
  it("renders permission, local intake and retained outcomes as different states", async () => {
    for (const scenario of ["permission", "intake", "outcomes"] as const) {
      const svg = await specimen(0, 1000, scenario);
      expect(svg.includes('data-access-granted="true"')).toBe(true);
      if (scenario === "intake") {
        expect(svg.includes('data-machine-lab-file=""')).toBe(true);
        expect(svg.includes('data-result-available="false"')).toBe(true);
      }
      if (scenario === "outcomes") {
        expect(svg.includes('data-machine-result=""')).toBe(true);
        expect(svg.includes('data-machine-shared-access=""')).toBe(true);
      }
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      if (process.env.HERO_PREVIEW_DIR)
        await writeFile(
          join(process.env.HERO_PREVIEW_DIR, `hero-exchange-${scenario}.png`),
          png,
        );
    }
  });

  it("renders the actual geometry and original assets without a server or browser", async () => {
    for (const [name, time, width] of [
      ["source", 0.6, 1000],
      ["protect", 2.05, 1000],
      ["receive", 3.4, 1000],
      ["mobile", 2.05, 390],
    ] as const) {
      const svg = await specimen(time, width);
      expect(svg.includes('data-machine="clinical-exchange"')).toBe(true);
      expect(svg.includes('data-machine-part="hub-worktop"')).toBe(true);
      expect(svg.indexOf('data-machine-part="foot-0"')).toBeLessThan(
        svg.indexOf('data-machine-part="chassis"'),
      );
      expect(svg.indexOf('data-machine-part="chassis"')).toBeLessThan(
        svg.indexOf('data-machine-part="deck"'),
      );
      expect(svg.indexOf('data-machine-part="deck"')).toBeLessThan(
        svg.indexOf('data-machine-part="medicalCenter-socket"'),
      );
      const png = await sharp(Buffer.from(svg)).resize(width).png().toBuffer();
      const metadata = await sharp(png).metadata();
      expect(metadata.width).toBe(width);
      expect(metadata.height).toBe(Math.round(width * 0.6));
      if (process.env.HERO_PREVIEW_DIR) {
        await writeFile(
          join(process.env.HERO_PREVIEW_DIR, `hero-exchange-${name}.png`),
          png,
        );
        if (name === "protect") {
          const crop = svg
            .replace('viewBox="0 0 1000 600"', 'viewBox="380 140 260 200"')
            .replace('width="1000" height="600"', 'width="260" height="200"');
          await writeFile(
            join(process.env.HERO_PREVIEW_DIR, "hero-exchange-detail.png"),
            await sharp(Buffer.from(crop)).resize(1040).png().toBuffer(),
          );
        }
      }
    }
  });
});
