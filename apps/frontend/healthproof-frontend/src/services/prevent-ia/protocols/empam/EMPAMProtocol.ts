/**
 * EMPAM — Examen de Medicina Preventiva del Adulto Mayor (65 años o más).
 *
 * Reutiliza los mismos módulos que EMPA (Laboratorio, Factores de Riesgo,
 * Hábitos, Información Conversacional) — no los reimplementa — y agrega el
 * módulo de Evaluación Funcional, propio del adulto mayor.
 */
import { riskLevelFromScore } from "../../health-score-engine";
import type {
  FunctionalAssessmentAnswers,
  HealthScoreModule,
  PreventProtocol,
  PreventProtocolAnalysis,
  PreventProtocolInput,
  ProtocolHealthScoreResult,
  ProtocolProfile,
  ProtocolQuestion,
} from "../base/PreventProtocol";
import {
  clampScore,
  computeConversationalModule,
  computeHabitsModule,
  computeLabAndTrendModules,
  sumModulePoints,
} from "../base/shared-modules";
import { empaProtocol } from "../empa/EMPAProtocol";

const EMPAM_MIN_AGE = 65;
/** Penalización por cada hallazgo positivo de riesgo funcional — transparente y acotada. */
const FUNCTIONAL_FINDING_PENALTY = 4;

const FUNCTIONAL_QUESTIONS: ProtocolQuestion[] = [
  { id: "walkingDifficulty", translationKey: "functional.walkingDifficulty" },
  { id: "recentFalls", translationKey: "functional.recentFalls" },
  { id: "usesCane", translationKey: "functional.usesCane" },
  { id: "memoryConcerns", translationKey: "functional.memoryConcerns" },
  {
    id: "basicActivitiesDifficulty",
    translationKey: "functional.basicActivitiesDifficulty",
  },
  {
    id: "unintentionalWeightLoss",
    translationKey: "functional.unintentionalWeightLoss",
  },
  { id: "polypharmacy", translationKey: "functional.polypharmacy" },
  { id: "socialIsolation", translationKey: "functional.socialIsolation" },
  {
    id: "functionalDependence",
    translationKey: "functional.functionalDependence",
  },
];

function computeFunctionalModule(
  functional: FunctionalAssessmentAnswers | undefined,
): HealthScoreModule {
  if (!functional) {
    return {
      key: "evaluacionFuncional",
      points: 0,
      explanation: "Evaluación funcional pendiente.",
    };
  }
  const positives = Object.values(functional).filter(
    (answer) => answer === true,
  ).length;
  const points = -(positives * FUNCTIONAL_FINDING_PENALTY);
  return {
    key: "evaluacionFuncional",
    points,
    explanation:
      positives > 0
        ? `${positives} hallazgo(s) de riesgo funcional detectado(s) (${points} pts)`
        : "Sin hallazgos de riesgo funcional",
  };
}

function buildHealthScore(
  input: PreventProtocolInput,
): ProtocolHealthScoreResult {
  const { modules } = computeLabAndTrendModules(input.current, input.history);
  modules.push(computeHabitsModule(input.conversational));
  modules.push(computeConversationalModule(input.conversational));
  modules.push(computeFunctionalModule(input.functional));

  const healthScore = clampScore(100 + sumModulePoints(modules));
  return { healthScore, riskLevel: riskLevelFromScore(healthScore), modules };
}

export const empamProtocol: PreventProtocol = {
  key: "empam",
  translationKey: "protocol.empam",

  matches(profile: ProtocolProfile): boolean {
    return profile.age >= EMPAM_MIN_AGE;
  },

  requiredQuestions(): ProtocolQuestion[] {
    // Mismas preguntas base de EMPA + la evaluación funcional propia del
    // adulto mayor — reutiliza, no duplica, el set de EMPA.
    return [...empaProtocol.requiredQuestions(), ...FUNCTIONAL_QUESTIONS];
  },

  healthScore(input: PreventProtocolInput): ProtocolHealthScoreResult {
    return buildHealthScore(input);
  },

  calculateRisk(healthScore: number) {
    return riskLevelFromScore(healthScore);
  },

  analyze(input: PreventProtocolInput): PreventProtocolAnalysis {
    const healthScore = buildHealthScore(input);
    const scoreExplanation = healthScore.modules
      .map((module) => module.explanation)
      .join("; ");
    return { protocol: "empam", healthScore, scoreExplanation };
  },

  recommendations(analysis: PreventProtocolAnalysis): string[] {
    const base = empaProtocol.recommendations(analysis);
    const functionalModule = analysis.healthScore.modules.find(
      (module) => module.key === "evaluacionFuncional",
    );
    if (functionalModule && functionalModule.points < 0) {
      return [
        ...base,
        "Evaluar apoyo funcional y de red de cuidado con el equipo de salud.",
      ];
    }
    return base;
  },
};
