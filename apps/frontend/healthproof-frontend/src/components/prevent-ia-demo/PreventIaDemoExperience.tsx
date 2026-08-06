"use client";

/**
 * Orquestador visual de la demo pública: renderiza el paso actual del
 * `DemoProvider` como una conversación con el agente, reutilizando EXACTAMENTE
 * los mismos componentes de presentación del dashboard autenticado
 * (`ScoreGauge`, `PatientPanel`, `ClinicalSummaryPanel`,
 * `LongitudinalComparisonChart`, `DemoDataBanner`) — la única pieza nueva es
 * el envoltorio conversacional (burbujas + botones), que no existía antes.
 *
 * El chat se adapta según el protocolo que `PreventProtocolEngine`
 * seleccionó (EMPA o EMPAM): el paso de Evaluación Funcional solo aparece
 * para EMPAM. No es un componente nuevo por protocolo — es el mismo
 * componente, mostrando un paso condicional más.
 */
import { HeartPulse, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ClinicalSummaryPanel } from "@/components/prevent-ia/ClinicalSummaryPanel";
import { LongitudinalComparisonChart } from "@/components/prevent-ia/LongitudinalComparisonChart";
import { PatientPanel } from "@/components/prevent-ia/PatientPanel";
import { ScoreGauge } from "@/components/prevent-ia/ScoreGauge";
import { Button } from "@/components/ui/Button";
import type { FunctionalAssessmentAnswers } from "@/services/prevent-ia/protocols/base/PreventProtocol";
import { type DemoShareTarget, SHARE_TARGETS, useDemo } from "./DemoProvider";
import { ExamSourcePicker } from "./ExamSourcePicker";

const MIN_CALCULATING_MS = 1600;
const DEFAULT_AGE_INPUT = 45;

const FUNCTIONAL_QUESTION_KEYS = [
  "walkingDifficulty",
  "recentFalls",
  "usesCane",
  "memoryConcerns",
  "basicActivitiesDifficulty",
  "unintentionalWeightLoss",
  "polypharmacy",
  "socialIsolation",
  "functionalDependence",
] as const satisfies readonly (keyof FunctionalAssessmentAnswers)[];

function AgentBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100">
        <HeartPulse className="h-5 w-5 text-sky-600" />
      </div>
      <div className="neu-surface flex-1 rounded-3xl rounded-tl-md px-5 py-4 text-base leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}

function AgentActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-3 pl-14">
      {children}
    </div>
  );
}

function AnalyzingStep() {
  const t = useTranslations("demoPreventIa");
  const { advanceFromAnalyzing } = useDemo();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <AgentBubble>
        <p className="font-semibold text-slate-800">{t("analyzingGreeting")}</p>
        {!revealed ? (
          <p className="mt-2 flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("wakingUp")}
          </p>
        ) : (
          <p className="mt-2">{t("evaluationIntro")}</p>
        )}
      </AgentBubble>
      {revealed && (
        <AgentActions>
          <Button onClick={advanceFromAnalyzing}>{t("continueButton")}</Button>
        </AgentActions>
      )}
    </div>
  );
}

function ProvideAgeStep() {
  const t = useTranslations("demoPreventIa");
  const { provideAge } = useDemo();
  const [value, setValue] = useState(String(DEFAULT_AGE_INPUT));

  const handleContinue = () => {
    const parsed = Number(value);
    provideAge(
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AGE_INPUT,
    );
  };

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <AgentBubble>{t("provideAgeQuestion")}</AgentBubble>
      <div className="mt-4 pl-14">
        <label className="flex max-w-[160px] flex-col gap-1 text-sm text-slate-600">
          {t("ageInputLabel")}
          <input
            type="number"
            min={0}
            max={120}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="neu-chip rounded-xl px-3 py-2 text-sm text-slate-700"
          />
        </label>
      </div>
      <AgentActions>
        <Button onClick={handleContinue}>{t("continueButton")}</Button>
      </AgentActions>
    </div>
  );
}

function FunctionalAssessmentStep() {
  const t = useTranslations("demoPreventIa");
  const { functional, setFunctionalAnswer, submitFunctionalAssessment } =
    useDemo();

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <AgentBubble>{t("functionalAssessmentIntro")}</AgentBubble>
      <div className="mt-4 grid gap-2 pl-14 sm:grid-cols-2">
        {FUNCTIONAL_QUESTION_KEYS.map((key) => (
          <label
            key={key}
            className="neu-chip flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={functional[key] === true}
              onChange={(e) => setFunctionalAnswer(key, e.target.checked)}
              className="h-4 w-4"
            />
            {t(`functional.${key}`)}
          </label>
        ))}
      </div>
      <AgentActions>
        <Button onClick={submitFunctionalAssessment}>
          {t("continueButton")}
        </Button>
      </AgentActions>
    </div>
  );
}

function CalculatingStep() {
  const t = useTranslations("demoPreventIa");
  const { analysis, runFinalAnalysis, goToResult } = useDemo();
  const [startedAt] = useState(() => Date.now());
  const triggeredRef = useRef(false);

  useEffect(() => {
    // `triggeredRef` garantiza una sola corrida al entrar a este paso, aunque
    // `runFinalAnalysis` cambie de identidad entre renders (lee el estado más
    // reciente del contexto de todos modos).
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    runFinalAnalysis();
  }, [runFinalAnalysis]);

  useEffect(() => {
    if (analysis.loading) return;
    if (!analysis.data && !analysis.error) return; // todavía no arrancó
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(MIN_CALCULATING_MS - elapsed, 0);
    const timer = setTimeout(goToResult, remaining);
    return () => clearTimeout(timer);
  }, [analysis.loading, analysis.data, analysis.error, startedAt, goToResult]);

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <AgentBubble>
        <p>{t("thanksMessage")}</p>
        <p className="mt-2 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("calculatingMessage")}
        </p>
      </AgentBubble>
    </div>
  );
}

function ResultStep() {
  const t = useTranslations("demoPreventIa");
  const tProtocol = useTranslations("protocol");
  const { analysis, goToRecommendations, restart } = useDemo();
  const [showClinicalDetail, setShowClinicalDetail] = useState(false);
  const data = analysis.data;

  if (!data) {
    return (
      <div className="neu-shell border border-white/70 p-6 sm:p-8">
        <AgentBubble>{analysis.error ?? t("loading")}</AgentBubble>
        <AgentActions>
          <Button variant="secondary" onClick={restart}>
            {t("restart")}
          </Button>
        </AgentActions>
      </div>
    );
  }

  const isHealthy = data.result.riskLevel === "bajo";

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <div className="flex items-center justify-center gap-2">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-600">
          {t("resultTitle")}
        </p>
        <span className="neu-chip rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600">
          {t("protocolAppliedLabel")}: {tProtocol(data.protocol)}
        </span>
      </div>
      <div className="mt-4 flex justify-center">
        <ScoreGauge
          score={data.result.healthScore}
          riskLevel={data.result.riskLevel}
        />
      </div>
      <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-slate-400">
        {t("resultBrand")}
      </p>
      <p className="mx-auto mt-3 max-w-md text-center text-lg font-semibold text-slate-800">
        {isHealthy ? t("statusHealthy") : t("statusAlert")}
      </p>
      <p className="mx-auto mt-2 max-w-md text-center text-base leading-relaxed text-slate-700">
        {t(`resultNarrative.${data.result.riskLevel}`)}
      </p>

      <div className="mt-6 text-center">
        <button
          type="button"
          className="text-xs font-medium text-sky-600 underline-offset-2 hover:underline"
          onClick={() => setShowClinicalDetail((v) => !v)}
        >
          {showClinicalDetail
            ? t("hideClinicalDetail")
            : t("viewClinicalDetail")}
        </button>
      </div>

      {showClinicalDetail && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ClinicalSummaryPanel
            result={data.result}
            current={data.current}
            history={data.history}
          />
          <div className="neu-surface p-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-600">
              {t("healthScoreModulesTitle")}
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {data.healthScoreModules.map((module) => (
                <li key={module.key} className="flex justify-between gap-3">
                  <span>{t(`healthScoreModule.${module.key}`)}</span>
                  <span
                    className={
                      module.points < 0
                        ? "font-medium text-amber-600"
                        : "text-slate-400"
                    }
                  >
                    {module.points === 0 ? "—" : module.points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:col-span-2">
            <LongitudinalComparisonChart points={data.scoreTimeline} />
          </div>
        </div>
      )}

      <AgentActions>
        <Button onClick={goToRecommendations}>{t("continueButton")}</Button>
      </AgentActions>
    </div>
  );
}

function RecommendationsStep() {
  const t = useTranslations("demoPreventIa");
  const { analysis, answerShareConsent } = useDemo();
  if (!analysis.data) return null;

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <AgentBubble>{t("recommendationsTitle")}</AgentBubble>
      <div className="mt-4 pl-14">
        <PatientPanel result={analysis.data.result} />
      </div>
      <AgentActions>
        <Button onClick={() => answerShareConsent(true)}>
          {t("continueButton")}
        </Button>
      </AgentActions>
    </div>
  );
}

export function PreventIaDemoExperience() {
  const t = useTranslations("demoPreventIa");
  const {
    step,
    answerConsentAge,
    answerSmoking,
    answerFamilyHistory,
    answerShareConsent,
    selectShareTarget,
    shareDecision,
    shareTarget,
    restart,
  } = useDemo();

  return (
    <>
      {step === "intro" && <ExamSourcePicker />}

      {step === "analyzing" && <AnalyzingStep />}

      {step === "consentAge" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>{t("consentAgeQuestion")}</AgentBubble>
          <AgentActions>
            <Button variant="secondary" onClick={() => answerConsentAge(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => answerConsentAge(true)}>
              {t("accept")}
            </Button>
          </AgentActions>
        </div>
      )}

      {step === "provideAge" && <ProvideAgeStep />}

      {step === "questionSmoking" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>{t("smokingQuestion")}</AgentBubble>
          <AgentActions>
            <Button variant="secondary" onClick={() => answerSmoking(false)}>
              {t("no")}
            </Button>
            <Button onClick={() => answerSmoking(true)}>{t("yes")}</Button>
          </AgentActions>
        </div>
      )}

      {step === "questionFamilyHistory" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>{t("familyHistoryQuestion")}</AgentBubble>
          <AgentActions>
            <Button
              variant="secondary"
              onClick={() => answerFamilyHistory(false)}
            >
              {t("no")}
            </Button>
            <Button onClick={() => answerFamilyHistory(true)}>
              {t("yes")}
            </Button>
          </AgentActions>
        </div>
      )}

      {step === "functionalAssessment" && <FunctionalAssessmentStep />}

      {step === "calculating" && <CalculatingStep />}

      {step === "result" && <ResultStep />}

      {step === "recommendations" && <RecommendationsStep />}

      {step === "shareConsent" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>{t("shareQuestion")}</AgentBubble>
          <AgentActions>
            <Button
              variant="secondary"
              onClick={() => answerShareConsent(false)}
            >
              {t("shareNo")}
            </Button>
            <Button onClick={() => answerShareConsent(true)}>
              {t("shareYes")}
            </Button>
          </AgentActions>
        </div>
      )}

      {step === "shareSelect" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>{t("shareSelectTitle")}</AgentBubble>
          <div className="mt-5 flex flex-wrap gap-3 pl-14">
            {SHARE_TARGETS.map((option: DemoShareTarget) => (
              <button
                key={option}
                type="button"
                onClick={() => selectShareTarget(option)}
                className="neu-chip rounded-2xl px-5 py-3 font-medium text-slate-800 transition-all hover:neu-pressed"
              >
                {t(`shareOptions.${option}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "shareConfirmed" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <AgentBubble>
            {shareDecision === "accepted" && shareTarget
              ? t("shareConfirmed", {
                  target: t(`shareOptions.${shareTarget}`),
                })
              : t("shareDeclined")}
          </AgentBubble>
          <AgentActions>
            <Button variant="secondary" onClick={restart}>
              {t("restart")}
            </Button>
          </AgentActions>
        </div>
      )}
    </>
  );
}
