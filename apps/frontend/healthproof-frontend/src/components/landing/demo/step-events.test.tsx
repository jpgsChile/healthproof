import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoActionRegistry,
  DemoPrimaryAction,
  useDemoPrimaryAction,
} from "./DemoPrimaryAction";
import { DoctorOrderStep } from "./DoctorOrderStep";
import { EncryptionDemo } from "./EncryptionDemo";
import { LabUploadStep } from "./LabUploadStep";
import { PatientSelectLabStep } from "./PatientSelectLabStep";
import { PatientShareStep } from "./PatientShareStep";

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  refs: [] as { current: unknown }[],
  refCursor: 0,
  effects: [] as (() => void)[],
  context: null as unknown,
  layoutCursor: 0,
  layouts: [] as { deps?: unknown[]; cleanup?: () => void }[],
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] = value;
      },
    ];
  },
  useCallback: (callback: unknown) => callback,
  useContext: () => hooks.context,
  useRef: (current: unknown) => {
    const index = hooks.refCursor++;
    hooks.refs[index] ||= { current };
    return hooks.refs[index];
  },
  useLayoutEffect: (
    effect: () => (() => void) | undefined,
    deps?: unknown[],
  ) => {
    const index = hooks.layoutCursor++;
    const previous = hooks.layouts[index];
    if (
      deps &&
      previous?.deps &&
      deps.length === previous.deps.length &&
      deps.every((value, i) => Object.is(value, previous.deps?.[i]))
    )
      return;
    hooks.effects.push(() => {
      previous?.cleanup?.();
      hooks.layouts[index] = { deps, cleanup: effect() };
    });
  },
  useEffect: () => {},
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) =>
    snapshot(),
}));
vi.mock("@/components/ui", () => ({ Button: "button" }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

function text(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (isValidElement<{ children?: ReactNode }>(node))
    return text(node.props.children);
  if (Array.isArray(node)) return node.map(text).join("");
  return "";
}
function click(node: ReactNode, label: string) {
  let handler: (() => void) | undefined;
  const visit = (child: ReactNode) => {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child))
      return;
    if (child.type === "button" && text(child.props.children) === label)
      handler = child.props.onClick;
    Children.forEach(child.props.children, visit);
  };
  visit(node);
  expect(handler).toBeTypeOf("function");
  handler?.();
}

describe("demo step event producers", () => {
  beforeEach(() => {
    hooks.states = [];
    hooks.cursor = 0;
    hooks.refs = [];
    hooks.refCursor = 0;
    hooks.effects = [];
    hooks.context = null;
    hooks.layoutCursor = 0;
    hooks.layouts = [];
  });
  it.each([
    ["orders", "examCBC", "file-selected"],
    ["upload", "uploadAction", "file-received"],
  ])(
    "reports %s actions from the laboratory without completing delivery",
    (stage, label, phase) => {
      hooks.states = [stage];
      const onPhaseChange = vi.fn(),
        onComplete = vi.fn();
      const tree = LabUploadStep({ onPhaseChange, onComplete });
      // The order button contains the exam title and patient summary.
      if (stage === "orders") {
        const visit = (node: ReactNode) => {
          if (
            !isValidElement<{ children?: ReactNode; onClick?: () => void }>(
              node,
            )
          )
            return;
          if (node.type === "button" && text(node).includes(label))
            node.props.onClick?.();
          else Children.forEach(node.props.children, visit);
        };
        visit(tree);
      } else click(tree, label);
      expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith(phase);
      expect(onComplete).not.toHaveBeenCalled();
    },
  );
  it("reports permission pending at assignment without prematurely granting it", () => {
    hooks.states = [0, false];
    const onPhaseChange = vi.fn(),
      onComplete = vi.fn();
    click(PatientSelectLabStep({ onPhaseChange, onComplete }), "assignLab");
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("permission-pending");
    expect(onComplete).not.toHaveBeenCalled();
  });
  // Finite hook probes exercise handlers and presentation contracts, not a DOM renderer.
  function render<T>(component: () => T): T {
    hooks.cursor = 0;
    hooks.refCursor = 0;
    hooks.effects = [];
    hooks.layoutCursor = 0;
    const tree = component();
    for (const effect of hooks.effects) effect();
    return tree;
  }
  function bind(scope: number) {
    const registry = createDemoActionRegistry();
    hooks.context = { registry, scope };
    return registry;
  }
  it("preserves standalone create, view/share, and encryption buttons", () => {
    const onComplete = vi.fn(),
      onPhaseChange = vi.fn(),
      onStart = vi.fn();
    click(
      render(() => DoctorOrderStep({ onComplete })),
      "createOrder",
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
    hooks.states = [];
    hooks.refs = [];
    hooks.layouts = [];
    const patient = () => PatientShareStep({ onComplete, onPhaseChange });
    click(render(patient), "viewResult");
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("result-viewed");
    click(render(patient), "shareAction");
    expect(onComplete).toHaveBeenCalledTimes(2);
    hooks.states = [];
    hooks.refs = [];
    hooks.layouts = [];
    click(
      render(() => EncryptionDemo({ onStart })),
      "encryptButton",
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });
  it.each([
    [
      1,
      () => PatientSelectLabStep({ onComplete: vi.fn(), completed: true }),
      "Lab CentralSantiago",
      "authorizeLab",
    ],
    [
      2,
      () => LabUploadStep({ onComplete: vi.fn(), completed: true }),
      null,
      "uploadAction",
    ],
  ] as const)(
    "re-arms completed step %s when choosing fresh inputs",
    (scope, component, selection, label) => {
      const registry = bind(scope);
      const tree = render(component);
      expect(registry.getSnapshot()?.action.complete).toBe(true);
      if (selection) click(tree, selection);
      else {
        const visit = (node: ReactNode) => {
          if (
            !isValidElement<{ children?: ReactNode; onClick?: () => void }>(
              node,
            )
          )
            return;
          if (node.type === "button") node.props.onClick?.();
          else Children.forEach(node.props.children, visit);
        };
        visit(tree);
      }
      render(component);
      expect(registry.getSnapshot()?.action).toMatchObject({
        label,
        complete: false,
      });
    },
  );
  it("binds the latest callback even when presentation does not change", () => {
    const registry = bind(0),
      old = vi.fn(),
      latest = vi.fn();
    const notify = vi.fn();
    registry.subscribe(notify);
    render(() => useDemoPrimaryAction({ label: "Create order", run: old }));
    render(() => useDemoPrimaryAction({ label: "Create order", run: latest }));
    registry.activate(0);
    expect(latest).toHaveBeenCalledTimes(1);
    expect(old).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it("creates an order once, retains manual Continue, and re-arms after editing", () => {
    const registry = bind(0),
      onComplete = vi.fn(),
      onPhaseChange = vi.fn();
    const component = () => DoctorOrderStep({ onComplete, onPhaseChange });
    render(component);
    registry.activate(0);
    registry.activate(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
    const done = render(component);
    expect(registry.getSnapshot()?.action.complete).toBe(true);
    click(done, "examRadiography");
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("order");
    render(component);
    expect(registry.getSnapshot()?.action.complete).toBe(false);
    registry.activate(0);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
  it.each([0, 1, 2, 3])(
    "restores completed step %s without repeating its action",
    (step) => {
      const registry = bind(step),
        onComplete = vi.fn();
      const components = [
        DoctorOrderStep,
        PatientSelectLabStep,
        LabUploadStep,
        PatientShareStep,
      ];
      render(() => components[step]({ completed: true, onComplete }));
      expect(registry.getSnapshot()?.action.complete).toBe(true);
      registry.activate(step);
      expect(onComplete).not.toHaveBeenCalled();
    },
  );
  it("authorizes once and remains busy until the existing confirmation callback", () => {
    const registry = bind(1),
      onComplete = vi.fn(),
      onPhaseChange = vi.fn();
    const component = () => PatientSelectLabStep({ onComplete, onPhaseChange });
    render(component);
    registry.activate(1);
    registry.activate(1);
    render(component);
    expect(registry.getSnapshot()?.action).toMatchObject({
      label: "authorizingLab",
      busy: true,
      complete: false,
    });
    registry.activate(1);
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("permission-pending");
    expect(onComplete).not.toHaveBeenCalled();
  });
  it.each([
    ["orders", "prepareUpload", "file-selected"],
    ["upload", "uploadAction", "file-received"],
    ["confirm", "confirmingDemo", null],
  ])(
    "binds laboratory %s without fabricating completion",
    (stage, label, phase) => {
      const registry = bind(2),
        onComplete = vi.fn(),
        onPhaseChange = vi.fn();
      hooks.states = [stage, false];
      render(() => LabUploadStep({ onComplete, onPhaseChange }));
      expect(registry.getSnapshot()?.action.label).toBe(label);
      registry.activate(2);
      registry.activate(2);
      if (phase) expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith(phase);
      else expect(registry.getSnapshot()?.action.busy).toBe(true);
      expect(onComplete).not.toHaveBeenCalled();
    },
  );
  it("binds the existing encryption start without duplicate work", () => {
    const registry = bind(2),
      onStart = vi.fn(),
      onEncrypted = vi.fn();
    const component = () => EncryptionDemo({ onStart, onEncrypted });
    render(component);
    expect(registry.getSnapshot()?.action.label).toBe("encryptFile");
    registry.activate(2);
    registry.activate(2);
    render(component);
    expect(registry.getSnapshot()?.action).toMatchObject({
      label: "encryptingFile",
      busy: true,
    });
    registry.activate(2);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEncrypted).not.toHaveBeenCalled();
  });
  it("views the result before sharing and only then offers Continue", () => {
    const registry = bind(3),
      onComplete = vi.fn(),
      onPhaseChange = vi.fn();
    const component = () => PatientShareStep({ onComplete, onPhaseChange });
    render(component);
    expect(registry.getSnapshot()?.action.label).toBe("viewResult");
    registry.activate(3);
    render(component);
    expect(onPhaseChange).toHaveBeenCalledExactlyOnceWith("result-viewed");
    expect(registry.getSnapshot()?.action).toMatchObject({
      label: "shareAction",
      complete: false,
    });
    registry.activate(3);
    render(component);
    expect(registry.getSnapshot()?.action.complete).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it("keeps busy copy visible and rejects the second click when the label becomes Continue", () => {
    const registry = bind(1),
      onContinue = vi.fn();
    registry.register(Symbol(), 1, { label: "authorizingLab", busy: true });
    const component = () =>
      DemoPrimaryAction({
        initialLabel: "authorizeLab",
        completed: false,
        continueLabel: "continueDemo",
        onContinue,
      });
    const busy = render(component);
    expect(busy.props["aria-busy"]).toBe(true);
    expect(busy.props.disabled).toBe(true);
    expect(text(busy)).toContain("authorizingLab");
    registry.register(Symbol(), 1, { label: "authorizeLab", complete: true });
    const ready = render(component);
    ready.props.onClick({ detail: 2 });
    expect(onContinue).not.toHaveBeenCalled();
    ready.props.onClick({ detail: 1 });
    ready.props.onClick({ detail: 1 });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(ready.props.id).toBe("hero-demo-primary");
  });
});
