import gsap from "gsap";
import { type RefObject, useLayoutEffect } from "react";
import {
  DOCUMENT_ORIGIN,
  EXCHANGE_DURATION,
  type ExchangeRoute,
  getExchangeFrame,
  getLaboratoryFrame,
  project,
} from "@/components/landing/anatomy/exchange";
import {
  getHeroFeedback,
  getHeroScene,
  type HeroDemoState,
} from "@/components/landing/demo/hero-demo-flow";

const PRESS_STROKE = project([0, 0, -11.8])[1] - project([0, 0, 0])[1];
const GATE_STROKE = project([0, 0, 14])[1] - project([0, 0, 0])[1];
const OUTCOMES = {
  order: "[data-machine-order-received]",
  assignment: "[data-machine-granted-access]",
  result: "[data-machine-result]",
  sharing: "[data-machine-shared-access]",
};

/** Motion illustrates events; semantic history survives interruptions and reduced motion. */
export function useHeroPathAnimation(
  sceneRef: RefObject<HTMLDivElement | null>,
  state: HeroDemoState,
  routes: readonly ExchangeRoute[],
) {
  const { isOpen, phase } = state;
  const activeRoute = getHeroScene(state).route;
  const { permissionGranted } = getHeroFeedback(state);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const media = gsap.matchMedia();
    media.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        still: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const press = scene.querySelector<SVGGElement>("[data-machine-press]");
        const intake = scene.querySelector<SVGGElement>(
          "[data-machine-intake]",
        );
        const stationary = scene.querySelector(
          "[data-machine-stationary-document]",
        );
        const labFile = scene.querySelector("[data-machine-lab-file]");
        const gatePosition = (amount: number) => ({
          attr: { transform: `translate(0 ${amount * GATE_STROKE})` },
        });
        const position = (target: Element, point: number[], opacity: number) =>
          gsap.set(target, {
            autoAlpha: opacity,
            attr: {
              transform: `translate(${point[0] - DOCUMENT_ORIGIN[0]} ${point[1] - DOCUMENT_ORIGIN[1]})`,
            },
          });

        gsap.set(scene.querySelectorAll("[data-hero-parcel]"), {
          autoAlpha: 0,
        });
        const parked = scene.querySelectorAll("[data-machine-parked]");
        if (parked.length) gsap.set(parked, { autoAlpha: 1 });
        if (intake) gsap.set(intake, { autoAlpha: 0 });
        if (stationary) gsap.set(stationary, { autoAlpha: 1 });
        if (press) gsap.set(press, { attr: { transform: "translate(0 0)" } });
        for (const shutter of scene.querySelectorAll<SVGGElement>(
          "[data-machine-shutter]",
        )) {
          gsap.set(
            shutter,
            gatePosition(
              shutter.dataset.machineShutter === "laboratory" &&
                permissionGranted
                ? 1
                : 0,
            ),
          );
        }
        for (const route of routes) {
          const trace = scene.querySelector(`[data-hero-route="${route.id}"]`);
          if (trace)
            gsap.set(trace, {
              opacity: activeRoute === route.id ? 0.85 : 0.12,
            });
        }
        // Static semantic outcomes are already rendered. Do not replace them with a blank scene.
        if (context.conditions?.still) return;

        const timeline = gsap.timeline({
          repeat: isOpen ? 0 : -1,
          repeatDelay: isOpen ? 0 : 1.2,
        });
        const selected = isOpen
          ? routes.filter((route) => route.id === activeRoute)
          : routes;
        for (const route of selected) {
          const carrier = scene.querySelector<SVGGElement>(
            `[data-hero-parcel="${route.id}"]`,
          );
          if (!carrier) continue;
          const path = scene.querySelector(`[data-hero-route="${route.id}"]`);
          const source = scene.querySelector(
            `[data-machine-shutter="${route.from}"]`,
          );
          const receiver = scene.querySelector(
            `[data-machine-shutter="${route.to}"]`,
          );
          const outcome = scene.querySelector(OUTCOMES[route.id]);
          const plain = carrier.querySelector("[data-document-plain]");
          const seal = carrier.querySelector("[data-document-seal]");
          // In guided mode the result is already in the encryption chamber.
          const start = isOpen && route.id === "result" ? 1.55 : 0;
          const clock = { time: start };
          if (outcome) timeline.set(outcome, { autoAlpha: 0 });
          const render = () => {
            const frame = getExchangeFrame(route, clock.time);
            scene.dataset.machineStage = frame.stage;
            scene.dataset.movingRoute = route.id;
            position(carrier, frame.position, frame.opacity);
            if (plain) gsap.set(plain, { opacity: 1 - frame.sealOpacity });
            if (seal) gsap.set(seal, { opacity: frame.sealOpacity });
            if (source)
              gsap.set(
                source,
                gatePosition(
                  Math.max(
                    route.from === "laboratory" && permissionGranted ? 1 : 0,
                    frame.sourceOpen,
                  ),
                ),
              );
            if (receiver)
              gsap.set(
                receiver,
                gatePosition(
                  route.id === "assignment"
                    ? frame.receiverOpen
                    : Math.max(
                        route.to === "laboratory" && permissionGranted ? 1 : 0,
                        frame.receiverOpen,
                      ),
                ),
              );
          };
          if (path) timeline.to(path, { opacity: 0.85, duration: 0.25 });
          timeline.call(render);
          timeline.to(clock, {
            time: EXCHANGE_DURATION,
            duration: EXCHANGE_DURATION - start,
            ease: "none",
            onUpdate: render,
          });
          if (outcome) timeline.set(outcome, { autoAlpha: 1 });
          if (source)
            timeline.set(
              source,
              gatePosition(
                route.from === "laboratory" && permissionGranted ? 1 : 0,
              ),
            );
          if (receiver)
            timeline.to(receiver, {
              ...gatePosition(
                route.to === "laboratory" && permissionGranted ? 1 : 0,
              ),
              duration: 0.35,
              ease: "sine.inOut",
            });
          if (path && !isOpen)
            timeline.to(path, { opacity: 0.12, duration: 0.3 });
          timeline.to({}, { duration: 0.45 });
        }

        if (
          isOpen &&
          (phase === "file-received" || phase === "encrypting") &&
          intake
        ) {
          const processing = phase === "encrypting";
          const clock = { progress: 0 };
          if (labFile) gsap.set(labFile, { autoAlpha: 0 });
          if (processing && stationary) gsap.set(stationary, { autoAlpha: 0 });
          timeline.to(clock, {
            progress: 1,
            duration: processing ? 0.4 : 0.85,
            ease: "none",
            onUpdate: () => {
              const frame = getLaboratoryFrame(clock.progress, processing);
              scene.dataset.machineStage = processing
                ? "encrypting"
                : "file-intake";
              position(intake, frame.position, frame.opacity);
            },
          });
          timeline.set(intake, { autoAlpha: 0 });
          if (processing && stationary)
            timeline.set(stationary, { autoAlpha: 1 });
          if (!processing && labFile) timeline.set(labFile, { autoAlpha: 1 });
          if (processing && press) {
            const stroke = { amount: 0 };
            timeline.to(stroke, {
              amount: 1,
              duration: 0.35,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
              onUpdate: () =>
                gsap.set(press, {
                  attr: {
                    transform: `translate(0 ${stroke.amount * PRESS_STROKE})`,
                  },
                }),
            });
          }
        }
        const request = scene.querySelector(
          "[data-machine-permission-request]",
        );
        if (isOpen && phase === "permission-pending" && request)
          timeline.to(request, {
            opacity: 0.55,
            duration: 0.6,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });

        let inView = true;
        const syncPlayback = () => timeline.paused(!inView || document.hidden);
        const observer = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          syncPlayback();
        });
        observer.observe(scene);
        document.addEventListener("visibilitychange", syncPlayback);
        syncPlayback();
        return () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", syncPlayback);
          delete scene.dataset.machineStage;
          delete scene.dataset.movingRoute;
        };
      },
      scene,
    );
    return () => media.revert();
  }, [sceneRef, routes, isOpen, activeRoute, phase, permissionGranted]);
}
