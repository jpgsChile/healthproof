/**
 * Cómputo de los módulos del Health Score que TODOS los protocolos
 * comparten (Laboratorio, Factores de Riesgo, Hábitos, Información
 * Conversacional). EMPA los usa tal cual; EMPAM los reutiliza y agrega
 * encima el módulo de Evaluación Funcional (ver `protocols/empam`).
 *
 * "Laboratorio" y "Factores de Riesgo" reutilizan `calculateHealthScore()`
 * de `health-score-engine.ts` sin modificarlo — solo re-etiquetan
 * `bandPenalty` (rango de referencia clínico) y `trendPenalty` (tendencia
 * vs. historial) como dos módulos explicables por separado.
 */
import {
  calculateHealthScore,
  type HealthScoreBreakdown,
} from "../../health-score-engine";
import type { ClinicalResult, PatientHistoryEntry } from "../../types";
import type {
  ConversationalAnswers,
  HealthScoreModule,
} from "./PreventProtocol";

/** Penalización por tabaquismo autorreportado — transparente y acotada, nunca oculta. */
const SMOKING_PENALTY = 5;
/** Penalización por antecedentes familiares relevantes autorreportados. */
const FAMILY_HISTORY_PENALTY = 3;

export function computeLabAndTrendModules(
  current: ClinicalResult,
  history: PatientHistoryEntry[],
): { modules: HealthScoreModule[]; breakdown: HealthScoreBreakdown } {
  const breakdown = calculateHealthScore(current, history);

  const modules: HealthScoreModule[] = [
    {
      key: "laboratorio",
      points: -breakdown.bandPenalty,
      explanation:
        breakdown.bandPenalty > 0
          ? `${current.examType} en rango "${breakdown.band.label}" (-${breakdown.bandPenalty} pts)`
          : `${current.examType} dentro de rango óptimo`,
    },
  ];

  if (!breakdown.historyMissing) {
    modules.push({
      key: "factoresRiesgo",
      points: -breakdown.trendPenalty,
      explanation:
        breakdown.trendPenalty > 0
          ? `Tendencia al alza vs. controles previos (-${breakdown.trendPenalty} pts)`
          : "Sin tendencia de riesgo adicional vs. controles previos",
    });
  }

  return { modules, breakdown };
}

export function computeHabitsModule(
  conversational: ConversationalAnswers,
): HealthScoreModule {
  const smokes = conversational.smoking === true;
  return {
    key: "habitos",
    points: smokes ? -SMOKING_PENALTY : 0,
    explanation: smokes
      ? `Tabaquismo autorreportado (-${SMOKING_PENALTY} pts)`
      : "Sin hábitos de riesgo autorreportados",
  };
}

export function computeConversationalModule(
  conversational: ConversationalAnswers,
): HealthScoreModule {
  const hasFamilyHistory = conversational.familyHistory === true;
  return {
    key: "conversacional",
    points: hasFamilyHistory ? -FAMILY_HISTORY_PENALTY : 0,
    explanation: hasFamilyHistory
      ? `Antecedentes familiares relevantes autorreportados (-${FAMILY_HISTORY_PENALTY} pts)`
      : "Sin antecedentes familiares relevantes autorreportados",
  };
}

export function sumModulePoints(modules: HealthScoreModule[]): number {
  return modules.reduce((sum, module) => sum + module.points, 0);
}

export function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}
