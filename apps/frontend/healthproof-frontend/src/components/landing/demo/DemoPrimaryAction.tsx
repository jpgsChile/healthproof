"use client";

import { Loader2 } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui";

interface DemoAction {
  label: string;
  run?: () => void;
  busy?: boolean;
  disabled?: boolean;
  complete?: boolean;
}

export function createDemoActionRegistry() {
  let current: {
    owner: symbol;
    scope: number;
    action: DemoAction;
    consumed: boolean;
  } | null = null;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    register(owner: symbol, scope: number, action: DemoAction) {
      const entry = { owner, scope, action, consumed: false };
      current = entry;
      notify();
      return () => {
        if (current !== entry) return;
        current = null;
        notify();
      };
    },
    activate(scope: number) {
      if (!current || current.scope !== scope || current.consumed) return;
      const { action } = current;
      if (action.busy || action.disabled || action.complete || !action.run)
        return;
      current.consumed = true;
      action.run();
    },
  };
}

const DemoActionContext = createContext<{
  registry: ReturnType<typeof createDemoActionRegistry>;
  scope: number;
} | null>(null);

export function DemoPrimaryActionProvider({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  const registry = useMemo(createDemoActionRegistry, []);
  const value = useMemo(() => ({ registry, scope: step }), [registry, step]);
  return (
    <DemoActionContext.Provider value={value}>
      {children}
    </DemoActionContext.Provider>
  );
}

/** Only presentation is shared; each step retains its own state and real handler. */
export function useDemoPrimaryAction(action: DemoAction, enabled = true) {
  const context = useContext(DemoActionContext);
  const owner = useRef(Symbol("demo-action"));
  const handler = useRef(action.run);
  useLayoutEffect(() => {
    handler.current = action.run;
  });
  const { label, busy, disabled, complete } = action;
  useLayoutEffect(() => {
    if (!context || !enabled) return;
    return context.registry.register(owner.current, context.scope, {
      label,
      busy,
      disabled,
      complete,
      run: () => handler.current?.(),
    });
  }, [context, enabled, label, busy, disabled, complete]);
  return context !== null;
}

const emptySnapshot = () => null;

export function DemoPrimaryAction({
  initialLabel,
  completed,
  continueLabel,
  onContinue,
}: {
  initialLabel: string;
  completed: boolean;
  continueLabel: string;
  onContinue: () => void;
}) {
  const context = useContext(DemoActionContext);
  if (!context) throw new Error("DemoPrimaryAction requires its provider");
  const { registry, scope } = context;
  const snapshot = useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    emptySnapshot,
  );
  const action = snapshot?.scope === scope ? snapshot.action : null;
  const ready = action ? action.complete : completed;
  const continued = useRef({ scope, ready, activated: false });
  useLayoutEffect(() => {
    if (
      continued.current.scope !== scope ||
      continued.current.ready !== ready
    ) {
      continued.current = { scope, ready, activated: false };
    }
  }, [scope, ready]);
  return (
    <Button
      id="hero-demo-primary"
      data-demo-primary="true"
      size="sm"
      aria-busy={action?.busy || false}
      disabled={action?.busy || action?.disabled || false}
      onClick={(event) => {
        if (event.detail > 1) return;
        if (ready) {
          if (continued.current.activated) return;
          continued.current.activated = true;
          onContinue();
        } else registry.activate(scope);
      }}
    >
      {action?.busy && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      )}
      {ready ? continueLabel : action?.label || initialLabel}
    </Button>
  );
}
