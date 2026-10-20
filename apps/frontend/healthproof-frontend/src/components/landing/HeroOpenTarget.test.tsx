import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, expect, it, vi } from "vitest";
import { HeroCarouselSection } from "@/components/landing/sections/HeroCarouselSection";

const calls = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: () => {},
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
  useReducer: (
    _reducer: unknown,
    arg: unknown,
    init: (value: unknown) => unknown,
  ) => [init(arg), calls.dispatch],
}));
vi.mock("gsap", () => ({ default: {} }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/ui", () => ({
  Button: "button",
  DecorativeCircle: "i",
  DecorativeCross: "i",
}));
vi.mock("@/components/landing/HeroDataScene", () => ({
  HeroDataScene: "qa-scene",
}));
vi.mock("@/components/landing/HeroDemoPanel", () => ({
  HeroDemoPanel: "qa-panel",
}));
vi.mock("@/components/landing/demo/DemoSummary", () => ({
  DemoSummary: "qa-summary",
}));

type Props = {
  children?: ReactNode;
  className?: string;
  ref?: { current: unknown };
  onOpenDemo?: () => void;
};

function nodes(node: ReactNode): ReactElement<Props>[] {
  if (!isValidElement<Props>(node)) return [];
  return [node, ...Children.toArray(node.props.children).flatMap(nodes)];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each(
  [320, 844, 1023, 1024].flatMap((width) =>
    [false, true].flatMap((reduced) =>
      [false, true].map((panelExists) => ({ width, reduced, panelExists })),
    ),
  ),
)(
  "reveals the open demo at width $width, reduced motion $reduced, panel mounted $panelExists",
  ({ width, reduced, panelExists }) => {
    const workspaceScroll = vi.fn();
    const panelScroll = vi.fn();
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal("HTMLElement", class {});
    vi.stubGlobal("document", {
      activeElement: null,
      getElementById: vi.fn((id: string) =>
        id === "hero-demo-panel" && panelExists
          ? { scrollIntoView: panelScroll }
          : null,
      ),
    });
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query === "(min-width: 1024px)" ? width >= 1024 : reduced,
      }),
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return 1;
    });

    const tree = nodes(HeroCarouselSection());
    const workspace = tree.find((node) =>
      node.props.className?.split(" ").includes("hero-workspace"),
    );
    expect(workspace?.props.ref).toBeDefined();
    if (!workspace?.props.ref) throw new Error("Hero workspace ref is missing");
    workspace.props.ref.current = { scrollIntoView: workspaceScroll };

    const scene = tree.find((node) => node.type === "qa-scene");
    expect(scene?.props.onOpenDemo).toBeTypeOf("function");
    if (!scene?.props.onOpenDemo)
      throw new Error("Demo opening action is missing");
    scene.props.onOpenDemo();
    expect(calls.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "open" });
    expect(workspaceScroll).not.toHaveBeenCalled();
    expect(panelScroll).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    expect(frame).toBeTypeOf("function");
    if (!frame) throw new Error("Opening animation frame is missing");

    frame(0);
    const usesPanel = width < 1024 && panelExists;
    expect(
      usesPanel ? panelScroll : workspaceScroll,
    ).toHaveBeenCalledExactlyOnceWith({
      block: "start",
      behavior: reduced ? "instant" : "smooth",
    });
    expect(usesPanel ? workspaceScroll : panelScroll).not.toHaveBeenCalled();
  },
);
