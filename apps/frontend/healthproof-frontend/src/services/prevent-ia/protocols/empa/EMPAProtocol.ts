/**
 * EMPA — Examen de Medicina Preventiva del Adulto (18 a 64 años).
 *
 * Mantiene exactamente el comportamiento que Prevent IA ya tenía: motor de
 * Health Score (Laboratorio + Factores de Riesgo) más los módulos nuevos de
 * Hábitos e Información Conversacional. No agrega Evaluación Funcional
 * (eso es EMPAM).
 */
import { riskLevelFromScore } from "../../health-score-engine";
import type {
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

const EMPA_MIN_AGE = 18;
const EMPA_MAX_AGE_EXCLUSIVE = 65;

const REQUIRED_QUESTIONS: ProtocolQuestion[] = [
  { id: "smoking", translationKey: "smokingQuestion" },
  { id: "familyHistory", translationKey: "familyHistoryQuestion" },
];

function buildHealthScore(
  input: PreventProtocolInput,
): ProtocolHealthScoreResult {
  const { modules } = computeLabAndTrendModules(input.current, input.history);
  modules.push(computeHabitsModule(input.conversational));
  modules.push(computeConversationalModule(input.conversational));

  const healthScore = clampScore(100 + sumModulePoints(modules));
  return { healthScore, riskLevel: riskLevelFromScore(healthScore), modules };
}

export const empaProtocol: PreventProtocol = {
  key: "empa",
  translationKey: "protocol.empa",

  matches(profile: ProtocolProfile): boolean {
    return profile.age >= EMPA_MIN_AGE && profile.age < EMPA_MAX_AGE_EXCLUSIVE;
  },

  requiredQuestions(): ProtocolQuestion[] {
    return REQUIRED_QUESTIONS;
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
    return { protocol: "empa", healthScore, scoreExplanation };
  },

  recommendations(analysis: PreventProtocolAnalysis): string[] {
    const { riskLevel } = analysis.healthScore;
    if (riskLevel === "bajo") {
      return ["Mantener tus controles preventivos habituales."];
    }
    if (riskLevel === "moderado") {
      return [
        "Caminar 30 minutos la mayoría de los días de la semana.",
        "Disminuir el consumo de azúcar y grasas saturadas.",
        "Repetir el control en 3 a 6 meses.",
      ];
    }
    return [
      "Consultar con un profesional de salud a la brevedad.",
      "Solicitar exámenes de control adicionales.",
      "Iniciar un seguimiento cercano de este resultado.",
    ];
  },
};
