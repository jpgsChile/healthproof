import { describe, expect, it, vi } from "vitest";
import { createDemoActionRegistry } from "./DemoPrimaryAction";

vi.mock("@/components/ui", () => ({ Button: "button" }));

describe("current demo action ownership", () => {
  it("does not let old cleanup clear a newer or nested owner", () => {
    const registry = createDemoActionRegistry();
    const first = Symbol(),
      second = Symbol();
    const action = { label: "Upload file", run: vi.fn() };
    const cleanup = registry.register(first, 2, action);
    registry.register(second, 2, { label: "Encrypt file", run: vi.fn() });
    cleanup();
    expect(registry.getSnapshot()?.action.label).toBe("Encrypt file");
    expect(registry.getSnapshot()?.scope).toBe(2);
  });
  it("uses the latest handler and consumes each synchronous action once", () => {
    const registry = createDemoActionRegistry();
    const owner = Symbol(),
      old = vi.fn(),
      latest = vi.fn();
    registry.register(owner, 0, { label: "Create order", run: old });
    registry.register(owner, 0, { label: "Create order", run: latest });
    registry.activate(0);
    registry.activate(0);
    registry.activate(1);
    expect(old).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });
  it("does not execute busy, disabled, or completed actions", () => {
    const registry = createDemoActionRegistry(),
      run = vi.fn();
    for (const state of [
      { busy: true },
      { disabled: true },
      { complete: true },
    ]) {
      registry.register(Symbol(), 2, {
        label: "Confirming demo...",
        run,
        ...state,
      });
      registry.activate(2);
    }
    expect(run).not.toHaveBeenCalled();
  });
});
