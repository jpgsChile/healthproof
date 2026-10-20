import gsap from "gsap";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  HERO_CIRCLE_DECORS,
  HERO_CROSS_DECORS,
} from "@/components/landing/constants";
import { DemoSummary } from "@/components/landing/demo/DemoSummary";
import {
  createHeroDemoState,
  heroDemoReducer,
} from "@/components/landing/demo/hero-demo-flow";
import { HeroDataScene } from "@/components/landing/HeroDataScene";
import { HeroDemoPanel } from "@/components/landing/HeroDemoPanel";
import { Button, DecorativeCircle, DecorativeCross } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import "../hero-demo.css";

export function HeroCarouselSection() {
  const t = useTranslations("hero");
  const tDemo = useTranslations("demoFlow");
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headline1Ref = useRef<HTMLSpanElement>(null);
  const headline2Ref = useRef<HTMLSpanElement>(null);
  const [demo, onAction] = useReducer(
    heroDemoReducer,
    undefined,
    createHeroDemoState,
  );
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!demo.isOpen && !showSummary) {
      openerRef.current?.focus({ preventScroll: true });
    }
  }, [demo.isOpen, showSummary]);

  useEffect(() => {
    const h1 = headline1Ref.current;
    const h2 = headline2Ref.current;
    if (!h1 || !h2 || demo.isOpen || showSummary) return;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.set(h2, { autoAlpha: 0 });
        gsap.set(h1, { autoAlpha: 1 });
        gsap
          .timeline({ repeat: -1 })
          .to(h1, { autoAlpha: 0, duration: 1.2, ease: "sine.inOut", delay: 3 })
          .to(h2, { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, "<0.3")
          .to(h2, { autoAlpha: 0, duration: 1.2, ease: "sine.inOut", delay: 3 })
          .to(h1, { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, "<0.3");
      },
      sectionRef,
    );
    return () => media.revert();
  }, [demo.isOpen, showSummary]);

  const openDemo = () => {
    if (demo.isOpen) return;
    setShowSummary(false);
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    onAction({ type: "open" });
    requestAnimationFrame(() => {
      const target = window.matchMedia("(min-width: 1024px)").matches
        ? workspaceRef.current
        : (document.getElementById("hero-demo-panel") ?? workspaceRef.current);
      target?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  };

  const closeDemo = () => {
    onAction({ type: "close" });
  };
  const revealSummary = () => {
    setShowSummary(true);
    requestAnimationFrame(() => {
      const summary = document.getElementById("hero-demo-summary");
      summary?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      summary?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
  };

  return (
    <section
      className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12"
      ref={sectionRef}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        {HERO_CIRCLE_DECORS.map((circle) => (
          <DecorativeCircle
            key={circle.className}
            {...circle}
            className={`absolute opacity-60 ${circle.className}`}
          />
        ))}
        {HERO_CROSS_DECORS.map((cross) => (
          <DecorativeCross
            key={cross.className}
            {...cross}
            className={`absolute opacity-60 ${cross.className}`}
          />
        ))}
      </div>

      <header className="relative z-10 mx-auto mb-6 max-w-5xl text-center sm:mb-10">
        <h1 className="relative text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          <span
            className="block bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text pb-2 text-transparent"
            ref={headline1Ref}
          >
            {t("headline1")}
          </span>
          <span
            className="invisible absolute inset-x-0 top-0 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent opacity-0"
            ref={headline2Ref}
          >
            {t("headline2")}
          </span>
        </h1>
      </header>

      <div
        ref={workspaceRef}
        className="hero-workspace relative z-10"
        data-demo-active={demo.isOpen || showSummary}
      >
        <HeroDataScene state={demo} onOpenDemo={openDemo} />
        {demo.isOpen && (
          <HeroDemoPanel
            state={demo}
            onAction={onAction}
            onClose={closeDemo}
            onFinish={revealSummary}
          />
        )}
        {!demo.isOpen && showSummary && (
          <DemoSummary onClose={() => setShowSummary(false)} />
        )}
      </div>

      <div className="relative z-10 mx-auto mt-7 flex max-w-xl flex-col items-center gap-3 text-center">
        {demo.hasFinished && !demo.isOpen ? (
          <>
            <p className="font-semibold text-slate-800">
              {tDemo("demoComplete")}
            </p>
            <p className="text-sm text-slate-500">{tDemo("demoCompleteSub")}</p>
            <Button onClick={revealSummary} variant="primary">
              {tDemo("viewSummary")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-500">
              {t("captionBase")}{" "}
              <strong className="text-slate-700">{t("captionBaseBold")}</strong>
              .
            </p>
            <Button onClick={() => router.push("/auth")} variant="primary">
              {t("buttonCta")}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
