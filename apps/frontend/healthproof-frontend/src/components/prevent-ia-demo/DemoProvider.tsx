"use client";

/**
 * DemoProvider — capa de estado de la demo pública de Prevent IA.
 *
 * Responsabilidad única: orquestar la conversación (paso actual,
 * consentimientos, examen elegido) e inyectar datos simulados al motor real
 * (`useDemoPreventIaAnalysis` → `analyzeDocumentDemo` → `runPreventIaAnalysis`
 * → `HealthScoreEngine` + `PreventIaAgent`, sin ninguna modificación a esas
 * reglas). No conoce detalles de presentación (eso vive en los componentes
 * de `prevent-ia-demo/*` y en los ya existentes de `prevent-ia/*`), y nunca
 * escribe en Supabase ni on-chain — solo mantiene estado en memoria del
 * navegador de este visitante.
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  AnalyzeDemoParams,
  DemoCustomExam,
} from "@/actions/prevent-ia/analyze-document-demo";
import { useDemoPreventIaAnalysis } from "@/hooks/prevent-ia/useDemoPreventIaAnalysis";
import type { ScenarioKey } from "@/services/prevent-ia/scenarios";

export type DemoStep =
  | "intro"
  | "analyzing"
  | "consentAge"
  | "questionSmoking"
  | "questionFamilyHistory"
  | "calculating"
  | "result"
  | "recommendations"
  | "shareConsent"
  | "shareSelect"
  | "shareConfirmed";

export const SHARE_TARGETS = [
  "cesfam",
  "hospital",
  "clinica",
  "medico",
] as const;
export type DemoShareTarget = (typeof SHARE_TARGETS)[number];

export type DemoExamChoice =
  | { type: "scenario"; scenario: ScenarioKey }
  | { type: "custom"; exam: DemoCustomExam };

interface DemoConsentAnswers {
  age: boolean | null;
  smoking: boolean | null;
  familyHistory: boolean | null;
}

interface DemoContextValue {
  step: DemoStep;
  examChoice: DemoExamChoice | null;
  consent: DemoConsentAnswers;
  shareDecision: "accepted" | "declined" | null;
  shareTarget: DemoShareTarget | null;
  analysis: ReturnType<typeof useDemoPreventIaAnalysis>;

  selectExam: (choice: DemoExamChoice) => void;
  startAnalysis: () => void;
  advanceFromAnalyzing: () => void;
  answerConsentAge: (value: boolean) => void;
  answerSmoking: (value: boolean) => void;
  answerFamilyHistory: (value: boolean) => void;
  goToResult: () => void;
  goToRecommendations: () => void;
  answerShareConsent: (accepted: boolean) => void;
  selectShareTarget: (target: DemoShareTarget) => void;
  restart: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const INITIAL_CONSENT: DemoConsentAnswers = {
  age: null,
  smoking: null,
  familyHistory: null,
};

export function DemoProvider({ children }: { children: ReactNode }) {
  const analysis = useDemoPreventIaAnalysis();

  const [step, setStep] = useState<DemoStep>("intro");
  const [examChoice, setExamChoice] = useState<DemoExamChoice | null>(null);
  const [consent, setConsent] = useState<DemoConsentAnswers>(INITIAL_CONSENT);
  const [shareDecision, setShareDecision] = useState<
    "accepted" | "declined" | null
  >(null);
  const [shareTarget, setShareTarget] = useState<DemoShareTarget | null>(null);

  const selectExam = useCallback((choice: DemoExamChoice) => {
    setExamChoice(choice);
  }, []);

  const startAnalysis = useCallback(() => {
    if (!examChoice) return;
    setStep("analyzing");
    const params: AnalyzeDemoParams =
      examChoice.type === "scenario"
        ? { scenario: examChoice.scenario }
        : { customExam: examChoice.exam };
    void analysis.run(params);
  }, [examChoice, analysis]);

  const advanceFromAnalyzing = useCallback(() => setStep("consentAge"), []);

  const answerConsentAge = useCallback((value: boolean) => {
    setConsent((prev) => ({ ...prev, age: value }));
    setStep("questionSmoking");
  }, []);

  const answerSmoking = useCallback((value: boolean) => {
    setConsent((prev) => ({ ...prev, smoking: value }));
    setStep("questionFamilyHistory");
  }, []);

  const answerFamilyHistory = useCallback((value: boolean) => {
    setConsent((prev) => ({ ...prev, familyHistory: value }));
    setStep("calculating");
  }, []);

  const goToResult = useCallback(() => setStep("result"), []);
  const goToRecommendations = useCallback(() => setStep("recommendations"), []);

  const answerShareConsent = useCallback((accepted: boolean) => {
    if (accepted) {
      setShareDecision("accepted");
      setStep("shareSelect");
    } else {
      setShareDecision("declined");
      setStep("shareConfirmed");
    }
  }, []);

  const selectShareTarget = useCallback((target: DemoShareTarget) => {
    setShareTarget(target);
    setStep("shareConfirmed");
  }, []);

  const restart = useCallback(() => {
    setStep("intro");
    setExamChoice(null);
    setConsent(INITIAL_CONSENT);
    setShareDecision(null);
    setShareTarget(null);
    analysis.reset();
  }, [analysis]);

  const value = useMemo<DemoContextValue>(
    () => ({
      step,
      examChoice,
      consent,
      shareDecision,
      shareTarget,
      analysis,
      selectExam,
      startAnalysis,
      advanceFromAnalyzing,
      answerConsentAge,
      answerSmoking,
      answerFamilyHistory,
      goToResult,
      goToRecommendations,
      answerShareConsent,
      selectShareTarget,
      restart,
    }),
    [
      step,
      examChoice,
      consent,
      shareDecision,
      shareTarget,
      analysis,
      selectExam,
      startAnalysis,
      advanceFromAnalyzing,
      answerConsentAge,
      answerSmoking,
      answerFamilyHistory,
      goToResult,
      goToRecommendations,
      answerShareConsent,
      selectShareTarget,
      restart,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo debe usarse dentro de <DemoProvider>");
  }
  return ctx;
}
