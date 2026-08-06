"use client";

/**
 * DemoProvider — capa de estado de la demo pública de la Evaluación
 * Preventiva Inteligente (EPI).
 *
 * Responsabilidad única: orquestar la conversación (paso actual,
 * consentimientos, examen elegido, edad) e inyectar datos simulados al
 * motor real (`useDemoPreventIaAnalysis` → `analyzeDocumentDemo` →
 * `PreventProtocolEngine` → protocolo EMPA/EMPAM → `HealthScoreEngine` +
 * `PreventIaAgent`, sin ninguna modificación a esas reglas). El paciente
 * nunca elige un protocolo: apenas autoriza compartir su edad,
 * `PreventProtocolEngine.selectProtocol()` decide automáticamente si
 * corresponde EMPA o EMPAM, y esta capa solo reacciona mostrando (o no) el
 * paso de Evaluación Funcional. Nunca escribe en Supabase ni on-chain —
 * solo mantiene estado en memoria del navegador de este visitante.
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
import {
  DEFAULT_ADULT_AGE,
  selectProtocol,
} from "@/services/prevent-ia/engine/PreventProtocolEngine";
import type {
  FunctionalAssessmentAnswers,
  ProtocolKey,
} from "@/services/prevent-ia/protocols/base/PreventProtocol";
import type { ScenarioKey } from "@/services/prevent-ia/scenarios";

export type DemoStep =
  | "intro"
  | "analyzing"
  | "consentAge"
  | "provideAge"
  | "questionSmoking"
  | "questionFamilyHistory"
  | "functionalAssessment"
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

const INITIAL_FUNCTIONAL: FunctionalAssessmentAnswers = {
  walkingDifficulty: false,
  recentFalls: false,
  usesCane: false,
  memoryConcerns: false,
  basicActivitiesDifficulty: false,
  unintentionalWeightLoss: false,
  polypharmacy: false,
  socialIsolation: false,
  functionalDependence: false,
};

interface DemoContextValue {
  step: DemoStep;
  examChoice: DemoExamChoice | null;
  consent: DemoConsentAnswers;
  age: number | null;
  /** Protocolo que el motor determina en base a la edad conocida (o al adulto por defecto) — solo para decidir qué paso mostrar, nunca lo elige el visitante. */
  protocol: ProtocolKey;
  functional: FunctionalAssessmentAnswers;
  shareDecision: "accepted" | "declined" | null;
  shareTarget: DemoShareTarget | null;
  analysis: ReturnType<typeof useDemoPreventIaAnalysis>;

  selectExam: (choice: DemoExamChoice) => void;
  startAnalysis: () => void;
  advanceFromAnalyzing: () => void;
  answerConsentAge: (accepted: boolean) => void;
  provideAge: (age: number) => void;
  answerSmoking: (value: boolean) => void;
  answerFamilyHistory: (value: boolean) => void;
  setFunctionalAnswer: (
    key: keyof FunctionalAssessmentAnswers,
    value: boolean,
  ) => void;
  submitFunctionalAssessment: () => void;
  runFinalAnalysis: () => void;
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
  const [age, setAge] = useState<number | null>(null);
  const [functional, setFunctional] =
    useState<FunctionalAssessmentAnswers>(INITIAL_FUNCTIONAL);
  const [shareDecision, setShareDecision] = useState<
    "accepted" | "declined" | null
  >(null);
  const [shareTarget, setShareTarget] = useState<DemoShareTarget | null>(null);

  // Misma fuente de verdad que el server action: PreventProtocolEngine.
  // El visitante nunca elige esto, solo lo determina la edad autorizada.
  const protocol = useMemo(
    () => selectProtocol({ age: age ?? DEFAULT_ADULT_AGE }).key,
    [age],
  );

  const selectExam = useCallback((choice: DemoExamChoice) => {
    setExamChoice(choice);
  }, []);

  const startAnalysis = useCallback(() => {
    if (!examChoice) return;
    setStep("analyzing");
  }, [examChoice]);

  const advanceFromAnalyzing = useCallback(() => setStep("consentAge"), []);

  const answerConsentAge = useCallback((accepted: boolean) => {
    setConsent((prev) => ({ ...prev, age: accepted }));
    setStep(accepted ? "provideAge" : "questionSmoking");
  }, []);

  const provideAge = useCallback((value: number) => {
    setAge(value);
    setStep("questionSmoking");
  }, []);

  const answerSmoking = useCallback((value: boolean) => {
    setConsent((prev) => ({ ...prev, smoking: value }));
    setStep("questionFamilyHistory");
  }, []);

  const answerFamilyHistory = useCallback(
    (value: boolean) => {
      setConsent((prev) => ({ ...prev, familyHistory: value }));
      setStep(protocol === "empam" ? "functionalAssessment" : "calculating");
    },
    [protocol],
  );

  const setFunctionalAnswer = useCallback(
    (key: keyof FunctionalAssessmentAnswers, value: boolean) => {
      setFunctional((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const submitFunctionalAssessment = useCallback(() => {
    setStep("calculating");
  }, []);

  const runFinalAnalysis = useCallback(() => {
    if (!examChoice) return;
    const params: AnalyzeDemoParams = {
      ...(examChoice.type === "scenario"
        ? { scenario: examChoice.scenario }
        : { customExam: examChoice.exam }),
      age: age ?? undefined,
      conversational: {
        smoking: consent.smoking,
        familyHistory: consent.familyHistory,
      },
      functional: protocol === "empam" ? functional : undefined,
    };
    void analysis.run(params);
  }, [examChoice, age, consent, functional, protocol, analysis]);

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
    setAge(null);
    setFunctional(INITIAL_FUNCTIONAL);
    setShareDecision(null);
    setShareTarget(null);
    analysis.reset();
  }, [analysis]);

  const value = useMemo<DemoContextValue>(
    () => ({
      step,
      examChoice,
      consent,
      age,
      protocol,
      functional,
      shareDecision,
      shareTarget,
      analysis,
      selectExam,
      startAnalysis,
      advanceFromAnalyzing,
      answerConsentAge,
      provideAge,
      answerSmoking,
      answerFamilyHistory,
      setFunctionalAnswer,
      submitFunctionalAssessment,
      runFinalAnalysis,
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
      age,
      protocol,
      functional,
      shareDecision,
      shareTarget,
      analysis,
      selectExam,
      startAnalysis,
      advanceFromAnalyzing,
      answerConsentAge,
      provideAge,
      answerSmoking,
      answerFamilyHistory,
      setFunctionalAnswer,
      submitFunctionalAssessment,
      runFinalAnalysis,
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
