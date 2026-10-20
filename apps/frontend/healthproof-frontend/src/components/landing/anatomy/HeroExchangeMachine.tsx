import { useId } from "react";
import {
  type DemoPhase,
  EMPTY_HERO_FEEDBACK,
  type HeroFeedback,
  type HeroRoute,
} from "../demo/hero-demo-flow";
import {
  BASE_SHADOW,
  CREDENTIAL,
  CREDENTIAL_KEY,
  DECK_OUTLINE,
  DOCUMENT,
  DOCUMENT_LINES,
  DOCUMENT_ORIGIN,
  DOCUMENT_SHIELD,
  EXCHANGE_PARTS,
  EXCHANGE_ROUTES,
  type ExchangePart,
  getExchangeFrame,
  type Material,
  project,
  TERMINALS,
} from "./exchange";
import type { Point3, SolidPaths } from "./geometry";

const PALETTE: Record<
  Material,
  { top: string; fill: string; sides: string[]; line: string }
> = {
  paper: {
    top: "#f9fbfd",
    fill: "#dce6ee",
    sides: ["#b9cbd8", "#cbd9e3", "#dae4ec", "#e5edf2"],
    line: "#93a9b9",
  },
  shell: {
    top: "#e6eef5",
    fill: "#b6cbdc",
    sides: ["#91acc3", "#a7bfd2", "#bdd1df", "#d0dfe9"],
    line: "#7996ae",
  },
  metal: {
    top: "#b7cbd9",
    fill: "#8ca5ba",
    sides: ["#657f97", "#819bb1", "#98b0c3", "#a9bfce"],
    line: "#617b93",
  },
  ink: {
    top: "#48677d",
    fill: "#2a4358",
    sides: ["#20374b", "#2d4960", "#37586e", "#42677c"],
    line: "#253f54",
  },
  accent: {
    top: "#b6eee9",
    fill: "#77c9d1",
    sides: ["#459cac", "#64b5c0", "#7fced3", "#9adfdf"],
    line: "#56a6b3",
  },
};

function Solid({ paths, material }: { paths: SolidPaths; material: Material }) {
  const colors = PALETTE[material];
  return (
    <>
      <path d={paths.fill} fill={colors.fill} />
      {paths.shades.map(
        (path, index) =>
          path && (
            <path
              key={colors.sides[index]}
              d={path}
              fill={colors.sides[index]}
            />
          ),
      )}
      <path d={paths.top} fill={colors.top} />
      <path
        d={paths.crease}
        fill="none"
        stroke={colors.line}
        strokeOpacity="0.38"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />
      <path
        d={paths.outline}
        fill="none"
        stroke={colors.line}
        strokeOpacity="0.55"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      {paths.bevel && (
        <path
          d={paths.bevel}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.65"
          strokeWidth="0.65"
        />
      )}
    </>
  );
}

function Part({ part, open = 0 }: { part: ExchangePart; open?: number }) {
  const actor = part.id.endsWith("-shutter")
    ? part.id.replace("-shutter", "")
    : undefined;
  const lamp = part.id.endsWith("-lamp")
    ? part.id.replace("-lamp", "")
    : undefined;
  return (
    <g
      data-machine-part={part.id}
      data-machine-shutter={actor}
      data-machine-lamp={lamp}
      transform={
        actor
          ? `translate(0 ${(project([0, 0, 14])[1] - project([0, 0, 0])[1]) * open})`
          : undefined
      }
    >
      <Solid paths={part.paths} material={part.material} />
    </g>
  );
}

function Document({ seal = 0 }: { seal?: number }) {
  return (
    <>
      <Solid paths={DOCUMENT} material="paper" />
      <g data-document-plain="" opacity={1 - seal}>
        {DOCUMENT_LINES.map((path) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke="#829db1"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        ))}
      </g>
      <g data-document-seal="" opacity={seal}>
        <path
          d={DOCUMENT_SHIELD}
          fill="#7bcfd2"
          stroke="#3b9aaa"
          strokeWidth="0.65"
        />
      </g>
    </>
  );
}

function Credential() {
  return (
    <g data-access-credential="">
      <Solid paths={CREDENTIAL} material="accent" />
      <path
        d={CREDENTIAL_KEY}
        fill="none"
        stroke="#346e83"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

function at(point: Point3) {
  const position = project(point);
  return `translate(${position[0] - DOCUMENT_ORIGIN[0]} ${position[1] - DOCUMENT_ORIGIN[1]})`;
}

interface HeroExchangeMachineProps {
  phase: DemoPhase | "tour";
  activeRoute: HeroRoute | null;
  feedback?: HeroFeedback;
  /** Finite offline preview; production motion is controlled by the demo hook. */
  frame?: { route: HeroRoute; time: number };
}

export function HeroExchangeMachine({
  phase,
  activeRoute,
  frame,
  feedback = EMPTY_HERO_FEEDBACK,
}: HeroExchangeMachineProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const chamberOccupied =
    phase === "encrypting" ||
    phase === "encrypted" ||
    (feedback.fileEncrypted && !feedback.resultAvailable);
  const previewRoute = frame
    ? EXCHANGE_ROUTES.find((route) => route.id === frame.route)
    : undefined;
  const previewPose =
    previewRoute && frame
      ? getExchangeFrame(previewRoute, frame.time)
      : undefined;
  const renderPart = (part: ExchangePart) => {
    const open =
      part.id === `${previewRoute?.from}-shutter`
        ? previewPose?.sourceOpen
        : part.id === `${previewRoute?.to}-shutter`
          ? previewPose?.receiverOpen
          : part.id === "laboratory-shutter" && feedback.permissionGranted
            ? 1
            : 0;
    return <Part key={part.id} part={part} open={open} />;
  };
  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid meet"
      className="hero-exchange-machine"
      aria-hidden="true"
      data-machine="clinical-exchange"
      data-access-granted={feedback.permissionGranted}
      data-file-received={feedback.fileReceived}
      data-result-available={feedback.resultAvailable}
    >
      <title>Clinical document exchange instrument</title>
      <defs>
        <filter
          id={`${id}-shadow`}
          x="-30%"
          y="-40%"
          width="160%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <path
        d={BASE_SHADOW}
        fill="#758d9f"
        opacity="0.16"
        filter={`url(#${id}-shadow)`}
      />
      {EXCHANGE_PARTS.filter((part) => part.id.startsWith("foot-")).map(
        renderPart,
      )}
      {EXCHANGE_PARTS.filter((part) => part.id === "chassis").map(renderPart)}
      {EXCHANGE_PARTS.filter((part) => part.id === "deck").map(renderPart)}
      {EXCHANGE_PARTS.filter((part) => part.layer === "ground").map(renderPart)}
      <path
        d={DECK_OUTLINE}
        fill="none"
        stroke="#a4bacb"
        strokeWidth="0.7"
        opacity="0.65"
      />
      {EXCHANGE_ROUTES.map((route) => (
        <path
          key={route.id}
          d={route.path}
          data-hero-route={route.id}
          data-active={activeRoute === route.id}
          className="hero-exchange-trace"
          fill="none"
          stroke="#7bc8d0"
          strokeWidth="1.6"
          opacity={activeRoute === route.id ? 0.85 : 0.12}
        />
      ))}
      {EXCHANGE_PARTS.filter((part) => part.layer === "back").map(renderPart)}

      {feedback.fileReceived && !feedback.fileEncrypted && !chamberOccupied && (
        <g
          data-machine-lab-file=""
          data-machine-parked=""
          transform={at(TERMINALS.laboratory.port)}
        >
          <Document />
        </g>
      )}
      {feedback.permissionGranted && !feedback.fileReceived && (
        <g
          data-machine-granted-access=""
          data-machine-parked=""
          transform={at(TERMINALS.laboratory.port)}
        >
          <Credential />
        </g>
      )}
      {feedback.orderReceived && !feedback.resultAvailable && (
        <g
          data-machine-order-received=""
          data-machine-parked=""
          transform={at(TERMINALS.patient.port)}
        >
          <Document />
        </g>
      )}
      {feedback.resultAvailable && (
        <g
          data-machine-result=""
          data-machine-parked=""
          transform={at(TERMINALS.patient.port)}
        >
          <Document seal={1} />
        </g>
      )}
      {feedback.accessShared && (
        <g
          data-machine-shared-access=""
          data-machine-parked=""
          transform={at(TERMINALS.medicalCenter.port)}
        >
          <Credential />
        </g>
      )}

      {EXCHANGE_ROUTES.map((route) => {
        const pose =
          frame?.route === route.id
            ? getExchangeFrame(route, frame.time)
            : null;
        return (
          <g
            key={route.id}
            data-hero-parcel={route.id}
            className="hero-exchange-carrier"
            style={{
              visibility: pose && pose.opacity > 0 ? "visible" : "hidden",
            }}
            opacity={pose?.opacity ?? 1}
            transform={
              pose
                ? `translate(${pose.position[0] - DOCUMENT_ORIGIN[0]} ${pose.position[1] - DOCUMENT_ORIGIN[1]})`
                : "translate(0 0)"
            }
          >
            {route.cargo === "credential" ? (
              <Credential />
            ) : (
              <Document seal={pose?.sealOpacity ?? (route.protected ? 1 : 0)} />
            )}
          </g>
        );
      })}
      <g data-machine-intake="" style={{ visibility: "hidden" }}>
        <Document />
      </g>
      {phase === "file-selected" && !feedback.fileReceived && (
        <g transform={at(TERMINALS.laboratory.port)} opacity="0.4">
          <Document />
        </g>
      )}
      {phase === "permission-pending" && (
        <g
          data-machine-permission-request=""
          transform={at(TERMINALS.patient.port)}
        >
          <Credential />
        </g>
      )}
      {chamberOccupied && (
        <g
          data-machine-stationary-document=""
          style={{ visibility: phase === "encrypting" ? "hidden" : "visible" }}
        >
          <Document
            seal={phase === "encrypted" || feedback.fileEncrypted ? 1 : 0}
          />
        </g>
      )}
      <g
        data-machine-press=""
        transform={`translate(0 ${(previewPose?.press ?? 0) * (project([0, 0, -11.8])[1] - project([0, 0, 0])[1])})`}
      >
        {EXCHANGE_PARTS.filter((part) => part.layer === "press").map(
          renderPart,
        )}
      </g>
      {EXCHANGE_PARTS.filter((part) => part.layer === "front").map(renderPart)}
    </svg>
  );
}
