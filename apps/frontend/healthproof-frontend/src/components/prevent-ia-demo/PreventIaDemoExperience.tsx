"use client";

/**
 * Orquestador visual de la demo pública: renderiza el paso actual del
 * `DemoProvider` como una conversación con el agente, reutilizando EXACTAMENTE
 * los mismos componentes de presentación del dashboard autenticado
 * (`ScoreGauge`, `PatientPanel`, `ClinicalSummaryPanel`,
 * `LongitudinalComparisonChart`, `DemoDataBanner`) — la única pieza nueva es
 * el envoltorio conversacional (burbujas + botones), que no existía antes.
 */
import { HeartPulse, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { ClinicalSummaryPanel } from "@/components/prevent-ia/ClinicalSummaryPanel";
import { LongitudinalComparisonChart } from "@/components/prevent-ia/LongitudinalComparisonChart";
import { PatientPanel } from "@/components/prevent-ia/PatientPanel";
import { ScoreGauge } from "@/components/prevent-ia/ScoreGauge";
import { Button } from "@/components/ui/Button";
import { type DemoShareTarget, SHARE_TARGETS, useDemo } from "./DemoProvider";
import { ExamSourcePicker } from "./ExamSourcePicker";

const MIN_CALCULATING_MS = 1600;

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
          <p className="mt-2">{t("analyzingBody")}</p>
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

function CalculatingStep() {
  const t = useTranslations("demoPreventIa");
  const { analysis, goToResult } = useDemo();
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (analysis.loading) return;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(MIN_CALCULATING_MS - elapsed, 0);
    const timer = setTimeout(goToResult, remaining);
    return () => clearTimeout(timer);
  }, [analysis.loading, startedAt, goToResult]);

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
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-600">
        {t("resultTitle")}
      </p>
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
