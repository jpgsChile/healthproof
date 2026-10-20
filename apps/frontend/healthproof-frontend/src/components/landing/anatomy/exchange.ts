import type { HeroActor, HeroRoute } from "../demo/hero-demo-flow";
import {
  depthOf,
  extrude,
  type Flat,
  iso,
  type Plane,
  type Point3,
  pathOf,
  roundedPlan,
  type SolidPaths,
  slabOf,
} from "./geometry";

export const CAMERA = {
  origin: [500, 285] as Flat,
  scale: 1.55,
  azimuth: 45,
  elevation: 30,
};
export const project = (point: Point3) => iso(point, CAMERA);
export const EXCHANGE_DURATION = 4.2;
export const DOCUMENT_ORIGIN = project([0, 0, 13]);

export const TERMINALS: Record<
  HeroActor,
  { center: Plane; anchor: Point3; port: Point3 }
> = {
  medicalCenter: {
    center: [-125, 65],
    anchor: [-125, 65, 8],
    port: [-92, 35, 13],
  },
  laboratory: {
    center: [65, -125],
    anchor: [65, -125, 8],
    port: [35, -92, 13],
  },
  patient: { center: [160, 50], anchor: [160, 50, 8], port: [115, 50, 13] },
};

export type Material = "paper" | "shell" | "metal" | "ink" | "accent";
export interface ExchangePart {
  id: string;
  layer: "foundation" | "ground" | "back" | "front" | "press";
  material: Material;
  paths: SolidPaths;
  depth: number;
  bounds: [number, number, number, number];
}
const parts: ExchangePart[] = [];
function solid(
  id: string,
  ring: Plane[],
  z: number,
  height: number,
  material: Material = "shell",
  layer: ExchangePart["layer"] = "ground",
) {
  const projected = ring.flatMap(([x, y]) => [
    project([x, y, z]),
    project([x, y, z + height]),
  ]);
  const center = ring.reduce(
    (sum, [x, y]) => [sum[0] + x / ring.length, sum[1] + y / ring.length],
    [0, 0],
  );
  parts.push({
    id,
    layer,
    material,
    paths: extrude(ring, z, height, CAMERA, {
      bevel: Math.min(height / 3, 0.7),
    }),
    depth: depthOf([center[0], center[1], z + height / 2], CAMERA),
    bounds: [
      Math.min(...projected.map(([x]) => x)),
      Math.min(...projected.map(([, y]) => y)),
      Math.max(...projected.map(([x]) => x)),
      Math.max(...projected.map(([, y]) => y)),
    ],
  });
}
function slab(
  id: string,
  x: number,
  y: number,
  w: number,
  d: number,
  z: number,
  height: number,
  material: Material = "shell",
  layer: ExchangePart["layer"] = "ground",
  r = 2,
) {
  solid(id, roundedPlan({ x, y, w, d, r }, 5), z, height, material, layer);
}
function screw(
  id: string,
  x: number,
  y: number,
  z: number,
  layer: ExchangePart["layer"] = "ground",
) {
  slab(id, x - 1.2, y - 1.2, 2.4, 2.4, z, 0.7, "metal", layer, 1);
}

function roundedPolygon(points: Plane[], radius: number): Plane[] {
  return points.flatMap((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const approach = (other: Plane): Plane => {
      const length = Math.hypot(other[0] - point[0], other[1] - point[1]);
      const t = Math.min(radius / length, 0.3);
      return [
        point[0] + (other[0] - point[0]) * t,
        point[1] + (other[1] - point[1]) * t,
      ];
    };
    const from = approach(previous),
      to = approach(next);
    return Array.from({ length: 7 }, (_, step): Plane => {
      const t = step / 6;
      return [
        (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * point[0] + t ** 2 * to[0],
        (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * point[1] + t ** 2 * to[1],
      ];
    });
  });
}
const CHASSIS_RING = roundedPolygon(
  [
    [-173, 24],
    [24, -173],
    [105, -173],
    [194, 8],
    [194, 96],
    [-92, 106],
    [-173, 106],
  ],
  12,
);
const DECK_RING: Plane[] = CHASSIS_RING.map(([x, y]) => [
  x * 0.97 + 0.8,
  y * 0.97,
]);
// Structural containment precedes depth sorting: a rear fixture must never be
// painted underneath the large foundation merely because its centre is farther away.
for (const [index, [x, y]] of [
  [-153, 47],
  [48, -153],
  [172, 28],
  [156, 78],
].entries()) {
  slab(
    `foot-${index}`,
    x - 7,
    y - 7,
    14,
    14,
    -22,
    10,
    "metal",
    "foundation",
    4,
  );
}
solid("chassis", CHASSIS_RING, -12, 12, "shell", "foundation");
solid("deck", DECK_RING, 0, 1.5, "paper", "foundation");

for (const [key, terminal] of Object.entries(TERMINALS)) {
  const [x, y] = terminal.center;
  const [px, py] = terminal.port;
  slab(`${key}-base`, x - 34, y - 30, 68, 60, 1.5, 5, "shell", "ground", 7);
  slab(`${key}-seat`, x - 30, y - 26, 60, 52, 6.5, 1.5, "paper", "ground", 5);
  slab(`${key}-socket`, px - 15, py - 14, 30, 28, 2, 8, "metal", "ground", 4);
  slab(`${key}-tray`, px - 11, py - 12, 22, 24, 10, 1, "ink", "ground", 2);
  if (key === "laboratory") {
    slab(`${key}-guide-left`, px - 15, py - 14, 3, 28, 10, 5, "shell");
    slab(`${key}-guide-right`, px + 12, py - 14, 3, 28, 10, 5, "shell");
    slab(`${key}-shutter`, px - 10, py + 12, 20, 2, 10, 11, "metal");
  } else {
    slab(`${key}-guide-left`, px - 15, py - 14, 30, 3, 10, 5, "shell");
    slab(`${key}-guide-right`, px - 15, py + 11, 30, 3, 10, 5, "shell");
    slab(
      `${key}-shutter`,
      px + (key === "patient" ? -14 : 12),
      py - 10,
      2,
      20,
      10,
      11,
      "metal",
    );
  }
  slab(`${key}-lamp`, px - 6, py - 17, 12, 2.5, 10, 1, "accent");
  for (const [index, [dx, dy]] of [
    [-27, -23],
    [27, -23],
    [-27, 23],
    [27, 23],
  ].entries())
    screw(`${key}-screw-${index}`, x + dx, y + dy, 8);
}

const HUB: Point3 = [0, 0, 13];
const BRANCHES: Record<HeroActor, Point3[]> = {
  medicalCenter: [
    TERMINALS.medicalCenter.port,
    [-54, 35, 13],
    [-20, 0, 13],
    HUB,
  ],
  laboratory: [TERMINALS.laboratory.port, [35, -54, 13], [0, -20, 13], HUB],
  patient: [TERMINALS.patient.port, [65, 50, 13], [0, 50, 13], HUB],
};

function ribbon(from: Point3, to: Point3, width: number, offset = 0): Plane[] {
  const dx = to[0] - from[0],
    dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const nx = -dy / length,
    ny = dx / length;
  return [
    [from[0] + nx * (offset - width / 2), from[1] + ny * (offset - width / 2)],
    [to[0] + nx * (offset - width / 2), to[1] + ny * (offset - width / 2)],
    [to[0] + nx * (offset + width / 2), to[1] + ny * (offset + width / 2)],
    [from[0] + nx * (offset + width / 2), from[1] + ny * (offset + width / 2)],
  ];
}
for (const [key, points] of Object.entries(BRANCHES)) {
  for (let index = 0; index < points.length - 2; index++) {
    const from = points[index],
      to = points[index + 1];
    solid(`${key}-bed-${index}`, ribbon(from, to, 18), 2, 6, "shell");
    solid(`${key}-inset-${index}`, ribbon(from, to, 12), 8, 0.7, "metal");
    solid(`${key}-rail-a-${index}`, ribbon(from, to, 2, -8), 8, 3, "paper");
    solid(`${key}-rail-b-${index}`, ribbon(from, to, 2, 8), 8, 3, "paper");
    const middle: Point3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0];
    slab(
      `${key}-mount-${index}`,
      middle[0] - 4,
      middle[1] - 4,
      8,
      8,
      1.5,
      0.5,
      "metal",
    );
  }
}

// An open-front press: its front uprights occlude the carrier only at real edges.
slab("hub-floor", -32, -30, 64, 60, 2, 7, "metal", "back", 5);
slab("hub-worktop", -27, -25, 54, 50, 9, 1, "paper", "back", 3);
slab("hub-back-x-a", -32, -30, 5, 30, 9, 24, "shell", "back");
slab("hub-back-x-b", -32, 26, 5, 4, 9, 24, "shell", "back");
slab("hub-back-x-lintel", -32, 0, 5, 26, 23, 10, "shell", "back");
slab("hub-back-y-a", -27, -30, 27, 5, 9, 24, "shell", "back");
slab("hub-back-y-b", 24, -30, 8, 5, 9, 24, "shell", "back");
slab("hub-back-y-lintel", 0, -30, 24, 5, 23, 10, "shell", "back");
for (const [index, [x, y]] of [
  [-29, -27],
  [29, -27],
  [-29, 27],
  [29, 27],
].entries()) {
  slab(
    `hub-post-${index}`,
    x - 2,
    y - 2,
    4,
    4,
    9,
    41,
    "metal",
    index < 2 ? "back" : "front",
    1,
  );
  slab(`hub-collar-${index}`, x - 4, y - 4, 8, 8, 43, 4, "shell", "front");
  screw(`hub-top-screw-${index}`, x, y, 51, "front");
}
slab("hub-rim-back", -35, -32, 70, 10, 47, 5, "shell", "front", 3);
slab("hub-rim-front", -35, 22, 70, 10, 47, 5, "shell", "front", 3);
slab("hub-rim-left", -35, -22, 8, 44, 47, 5, "shell", "front", 2);
slab("hub-rim-right", 27, -22, 8, 44, 47, 5, "shell", "front", 2);
slab("hub-drive-bridge", -27, -4, 54, 8, 47, 5, "metal", "front", 2);
slab("hub-display-case", -24, -30, 24, 8, 52, 2, "metal", "front", 2);
slab("hub-display", -21, -28, 18, 4, 54, 0.5, "ink", "front", 1);
slab("hub-gland", -6, -6, 12, 12, 53.5, 3, "metal", "front", 3);
slab("hub-status", 8, -30, 15, 7, 52, 1, "accent", "front", 2);
for (let index = 0; index < 5; index++)
  slab(
    `hub-vent-${index}`,
    -20 + index * 9,
    24,
    4,
    5,
    52,
    0.5,
    "metal",
    "front",
    1,
  );
slab("press-shaft", -3, -3, 6, 6, 31, 40, "metal", "press", 1);
slab("press-head", -18, -15, 36, 30, 28, 4, "metal", "press", 3);
slab("press-pad", -14, -11, 28, 22, 26, 2, "accent", "press", 2);

export const EXCHANGE_PARTS = parts.sort((a, b) => a.depth - b.depth);
export const DECK_OUTLINE = pathOf(
  DECK_RING.map(([x, y]) => project([x * 0.97, y * 0.97, 1.6])),
  true,
);
export const BASE_SHADOW = pathOf(
  CHASSIS_RING.map(([x, y]) => project([x + 6, y + 6, -23])),
  true,
);
export const DOCUMENT = slabOf(
  { x: -7, y: -10, w: 14, d: 20, r: 1 },
  13,
  1.2,
  CAMERA,
  5,
  0.3,
);
export const DOCUMENT_LINES = [-4, 0, 4].map((y, index) =>
  pathOf([project([-4, y, 14.3]), project([4 - index, y, 14.3])]),
);
export const DOCUMENT_SHIELD = pathOf(
  [
    [-4, -5],
    [0, -7],
    [4, -5],
    [3, 1],
    [0, 4],
    [-3, 1],
  ].map(([x, y]) => project([x, y, 14.5])),
  true,
);

export const CREDENTIAL = slabOf(
  { x: -10, y: -6.5, w: 20, d: 13, r: 2 },
  13,
  1.8,
  CAMERA,
  5,
  0.4,
);
export const CREDENTIAL_KEY = pathOf(
  [
    [-3, -2],
    [-5, -2],
    [-6, 0],
    [-5, 2],
    [-3, 2],
    [-2, 0],
    [5, 0],
    [5, 3],
    [3, 3],
  ].map(([x, y]) => project([x, y, 15])),
);

export interface ExchangeRoute {
  cargo: "document" | "credential";
  id: HeroRoute;
  from: HeroActor;
  to: HeroActor;
  protected: boolean;
  inbound: Point3[];
  outbound: Point3[];
  path: string;
  label: string;
}
function route(
  id: HeroRoute,
  from: HeroActor,
  to: HeroActor,
  protectedDocument: boolean,
  label: string,
): ExchangeRoute {
  const inbound = BRANCHES[from],
    outbound = [...BRANCHES[to]].reverse();
  return {
    id,
    from,
    to,
    protected: protectedDocument,
    cargo: id === "assignment" || id === "sharing" ? "credential" : "document",
    inbound,
    outbound,
    path: pathOf([...inbound, ...outbound.slice(1)].map(project)),
    label,
  };
}
export const EXCHANGE_ROUTES = [
  route("order", "medicalCenter", "patient", false, "sceneOrder"),
  route("assignment", "patient", "laboratory", false, "scenePermission"),
  route("result", "laboratory", "patient", true, "sceneResult"),
  route("sharing", "patient", "medicalCenter", false, "sceneShare"),
];
function along(points: Point3[], progress: number): Flat {
  if (progress <= 0) return project(points[0]);
  if (progress >= 1) return project(points[points.length - 1]);
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[1] - points[index][1]),
    );
  let distance = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index]) {
      const t = distance / lengths[index],
        a = points[index],
        b = points[index + 1];
      return project([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
    distance -= lengths[index];
  }
  return project(points[points.length - 1]);
}
const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
export function getExchangeFrame(route: ExchangeRoute, time: number) {
  const t = Math.max(0, Math.min(EXCHANGE_DURATION, time));
  const stage =
    t < 0.4
      ? "prepare"
      : t < 1.55
        ? "inbound"
        : t < 2.35
          ? route.cargo === "credential"
            ? "authorize"
            : route.protected
              ? "release"
              : "dispatch"
          : t < 3.6
            ? "outbound"
            : "received";
  const position =
    t < 0.4
      ? along(route.inbound, 0)
      : t < 1.55
        ? along(route.inbound, ease((t - 0.4) / 1.15))
        : t < 2.35
          ? project(HUB)
          : t < 3.6
            ? along(route.outbound, ease((t - 2.35) / 1.25))
            : along(route.outbound, 1);
  return {
    stage,
    position,
    // Delivery does not encrypt again. Only the actual encrypting phase drives the press.
    press: 0,
    sealed: route.protected,
    sealOpacity: route.protected ? 1 : 0,
    sourceOpen:
      t < 0.4 ? ease(t / 0.4) : t < 1 ? 1 : t < 1.3 ? ease((1.3 - t) / 0.3) : 0,
    receiverOpen: t < 3.2 ? 0 : t < 3.6 ? ease((t - 3.2) / 0.4) : 1,
    opacity: Math.min(1, t / 0.18, (EXCHANGE_DURATION - t) / 0.3),
  };
}

/** Local file intake ends at the laboratory, never at the patient. */
export function getLaboratoryFrame(progress: number, processing = false) {
  const p = Math.max(0, Math.min(1, progress));
  const points: Point3[] = processing
    ? BRANCHES.laboratory
    : [[65, -125, 38], [48, -105, 22], TERMINALS.laboratory.port];
  return { position: along(points, ease(p)), opacity: Math.min(1, p / 0.15) };
}
