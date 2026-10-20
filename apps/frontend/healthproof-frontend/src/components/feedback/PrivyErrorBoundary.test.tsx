import { createRequire } from "node:module";
import type { createTranslator as TranslatorFactory } from "next-intl";
import type { Component, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { PrivyErrorBoundary } from "./PrivyErrorBoundary";

// Resolve the real ICU formatter through next-intl's installed peer, without providers.
const require = createRequire(import.meta.url);
const intlRequire = createRequire(require.resolve("next-intl"));
const { createTranslator } = intlRequire("use-intl/core") as {
  createTranslator: typeof TranslatorFactory;
};
const h = vi.hoisted(() => ({ translator: undefined as unknown }));
vi.mock("next-intl", () => ({ useTranslations: () => h.translator }));

afterEach(() => vi.unstubAllGlobals());

it.each([
  "https://demo.example.test",
  "http://localhost:3000",
  "https://[2001:db8::1]:8443",
  "file://",
])("formats origin %s once in both locales", (origin) => {
  for (const [locale, messages] of [
    ["en", en],
    ["es", es],
  ] as const) {
    vi.stubGlobal("window", { location: { origin } });
    const { boundary, onError, rich } = setup(locale, messages);
    expect(rich).not.toHaveBeenCalled();
    boundary.state = { hasError: true, error: new Error("Origin not allowed") };
    const html = renderToStaticMarkup(boundary.render());
    expect(html.match(/<code\b/g)).toHaveLength(1);
    expect(html.split(origin)).toHaveLength(2);
    expect(rich).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  }
});

function setup(locale: string, messages: { privyError: typeof en.privyError }) {
  const onError = vi.fn();
  const translator = createTranslator({
    locale,
    messages: messages.privyError,
    onError,
  });
  const rich = vi.spyOn(translator, "rich");
  h.translator = translator;
  const element = PrivyErrorBoundary({
    children: <span>Healthy children</span>,
  });
  const Boundary = element.type as new (
    props: typeof element.props,
  ) => Component<typeof element.props, { hasError: boolean; error?: Error }> & {
    render(): ReactNode;
    componentDidCatch(error: Error, info: { componentStack: string }): void;
  };
  const boundary = new Boundary(element.props);
  return { boundary, onError, rich };
}

for (const [locale, messages] of [
  ["en", en],
  ["es", es],
] as const) {
  it(`${locale}: defers origin formatting for normal children and generic errors`, () => {
    const { boundary, onError, rich } = setup(locale, messages);
    expect(renderToStaticMarkup(boundary.render())).toBe(
      "<span>Healthy children</span>",
    );
    const error = new Error("Unrelated <failure>");
    boundary.state = { hasError: true, error };
    const html = renderToStaticMarkup(boundary.render());
    expect(html).toContain(messages.privyError.genericTitle);
    expect(html).toContain(messages.privyError.genericDesc);
    expect(html).toContain("Unrelated &lt;failure&gt;");
    expect(html).not.toContain("<code");
    expect(rich).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it(`${locale}: renders one safely escaped origin with real ICU rich interpolation`, () => {
    const origin = 'https://example.test/<script>"&';
    vi.stubGlobal("window", { location: { origin } });
    const { boundary, onError, rich } = setup(locale, messages);
    boundary.state = {
      hasError: true,
      error: new Error("Privy: Origin not allowed"),
    };
    const html = renderToStaticMarkup(boundary.render());
    expect(html).toContain(messages.privyError.privyTitle);
    expect(html).toContain(messages.privyError.privyStepsTitle);
    for (const key of ["step1", "step2", "step3", "step4", "step5"] as const)
      expect(html).toContain(
        renderToStaticMarkup(<li>{messages.privyError[key]}</li>),
      );
    expect(html.match(/https:\/\/example\.test\//g)).toHaveLength(1);
    expect(html).toContain(
      '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">https://example.test/&lt;script&gt;&quot;&amp;</code>',
    );
    expect(html).not.toMatch(
      /INVALID_MESSAGE|MALFORMED_ARGUMENT|\{origin\}|<script>/,
    );
    expect(rich).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
}

it("keeps the localhost fallback and caught-error logging", () => {
  const { boundary, onError } = setup("en", en);
  const error = new Error("Origin not allowed");
  boundary.state = { hasError: true, error };
  expect(renderToStaticMarkup(boundary.render())).toContain(
    'font-mono text-xs">localhost</code>',
  );
  expect(onError).not.toHaveBeenCalled();
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    boundary.componentDidCatch(error, { componentStack: "Test child" });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "[PrivyErrorBoundary] caught error:",
      {
        message: error.message,
        stack: error.stack,
        componentStack: "Test child",
      },
    );
  } finally {
    log.mockRestore();
  }
});
