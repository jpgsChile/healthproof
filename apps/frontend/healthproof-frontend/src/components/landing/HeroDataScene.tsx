"use client";

import {
  ArrowRight,
  Check,
  LockKeyhole,
  Play,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { useHeroPathAnimation } from "@/hooks/ui/useHeroPathAnimation";
import { EXCHANGE_ROUTES, project, TERMINALS } from "./anatomy/exchange";
import { HeroExchangeMachine } from "./anatomy/HeroExchangeMachine";
import { ACTORS } from "./constants";
import {
  getHeroFeedback,
  getHeroScene,
  type HeroActor,
  type HeroDemoState,
} from "./demo/hero-demo-flow";

const ACTOR_KEYS: HeroActor[] = ["medicalCenter", "laboratory", "patient"];

export const HERO_ROUTES = EXCHANGE_ROUTES;

interface HeroDataSceneProps {
  state: HeroDemoState;
  onOpenDemo: () => void;
}

export function HeroDataScene({ state, onOpenDemo }: HeroDataSceneProps) {
  const t = useTranslations("demoFlow");
  const tActors = useTranslations("actors");
  const sceneRef = useRef<HTMLDivElement>(null);
  const scene = getHeroScene(state);
  const feedback = getHeroFeedback(state);
  useHeroPathAnimation(sceneRef, state, HERO_ROUTES);

  return (
    <div className="hero-scene-column neu-shell" data-guided={state.isOpen}>
      <div className="hero-scene-heading">
        <span className="hero-scene-eyebrow">
          <span className="hero-figure-index">01</span>
          <ShieldCheck size={14} /> HealthProof
        </span>
        <button
          type="button"
          onClick={onOpenDemo}
          aria-controls="hero-demo-panel"
          aria-expanded={state.isOpen}
          className="hero-demo-trigger"
        >
          <Play size={12} fill="currentColor" />
          {state.isOpen ? t("sceneGuided") : t("tryItNow")}
        </button>
      </div>

      <div
        className="hero-data-scene"
        ref={sceneRef}
        data-phase={state.isOpen ? state.phase : "tour"}
      >
        <HeroExchangeMachine
          phase={state.isOpen ? state.phase : "tour"}
          activeRoute={scene.route}
          feedback={feedback}
        />

        {ACTORS.map((actor, index) => {
          const key = ACTOR_KEYS[index];
          const active =
            scene.actor === key || (state.isOpen && state.step === 4);
          const anchor = project(TERMINALS[key].anchor);
          return (
            <button
              key={key}
              type="button"
              className={`hero-scene-actor hero-scene-actor--${key}`}
              data-active={active}
              style={{
                left: `${anchor[0] / 10}%`,
                top: `${(anchor[1] + 26) / 6}%`,
              }}
              aria-controls="hero-demo-panel"
              aria-expanded={state.isOpen}
              onClick={onOpenDemo}
            >
              <span
                className="hero-actor-halo"
                data-hero-halo={key}
                aria-hidden="true"
              />
              <span className="hero-actor-image">
                <Image
                  src={actor.image}
                  alt={tActors(key)}
                  fill
                  priority
                  sizes="(max-width: 640px) 110px, (max-width: 1024px) 190px, 240px"
                />
              </span>
              <span className="hero-actor-label">
                {tActors(key)}
                {state.hasFinished && !state.isOpen && (
                  <Check size={13} aria-hidden="true" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {(state.isOpen || state.completed.some(Boolean)) && (
        <>
          <p className="hero-feedback-label">{t("stageProgress")}</p>
          <ol className="hero-stage-progress" aria-label={t("stageProgress")}>
            {feedback.stages.map((stage) => (
              <li
                key={stage.label}
                data-status={stage.status}
                aria-current={stage.status === "active" ? "step" : undefined}
              >
                {stage.status === "complete" ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <span className="hero-stage-dot" aria-hidden="true" />
                )}
                <span>{t(stage.label)}</span>
                <span className="sr-only">
                  {" "}
                  —{" "}
                  {t(
                    stage.status === "complete"
                      ? "statusComplete"
                      : stage.status === "active"
                        ? "statusActive"
                        : "statusPending",
                  )}
                </span>
              </li>
            ))}
          </ol>
          <ul className="hero-outcomes" aria-label={t("recordedOutcomes")}>
            {feedback.permissionGranted && (
              <li>
                <LockKeyhole size={12} aria-hidden="true" />
                {t("permissionGranted")}
              </li>
            )}
            {feedback.fileReceived && !feedback.resultAvailable && (
              <li>
                <Check size={12} aria-hidden="true" />
                {t(feedback.fileEncrypted ? "fileProtected" : "fileReceived")}
              </li>
            )}
            {feedback.resultAvailable && (
              <li>
                <Check size={12} aria-hidden="true" />
                {t(
                  feedback.resultViewed ? "resultConsulted" : "resultAvailable",
                )}
              </li>
            )}
            {feedback.accessShared && (
              <li>
                <LockKeyhole size={12} aria-hidden="true" />
                {t("accessShared")}
              </li>
            )}
          </ul>
        </>
      )}

      <output
        className="hero-scene-caption"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="hero-status-dot" aria-hidden="true" />
        <span>{t(scene.label)}</span>
      </output>
      <ol className="hero-scene-legend" aria-label={t("sceneTour")}>
        {HERO_ROUTES.map((route, index) => (
          <li key={route.id} data-active={scene.route === route.id}>
            <span>{String(index + 1).padStart(2, "0")}</span> {t(route.label)}
            {index < HERO_ROUTES.length - 1 && (
              <ArrowRight size={12} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
