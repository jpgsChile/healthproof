"use server";

import { checkRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
/**
 * Entrada PÚBLICA (sin autenticación) a la Evaluación Preventiva Inteligente
 * (EPI): `PreventProtocolEngine` elige automáticamente el protocolo (EMPA o
 * EMPAM, según edad) y ese protocolo compone el mismo motor de Health Score
 * y el mismo agente que ya existían — no se duplica ninguna regla de
 * negocio.
 *
 * Existe para la demo pública (`/demo/prevent`) donde un visitante sin
 * cuenta puede probar la EPI. Nunca toca datos reales: solo opera sobre los
 * escenarios mock existentes o sobre un examen "custom" armado en memoria,
 * sin historial clínico real y sin ninguna escritura a Supabase/on-chain.
 */
import { runPreventIaAgent } from "@/services/prevent-ia/agent";
import { DEMO_EXAM_TYPES } from "@/services/prevent-ia/demo-exam-types";
import {
  DEFAULT_ADULT_AGE,
  selectProtocol,
} from "@/services/prevent-ia/engine/PreventProtocolEngine";
import type { ScoreTimelinePoint } from "@/services/prevent-ia/health-score-engine";
import {
  buildScoreTimeline,
  calculateHealthScore,
  type HealthScoreBreakdown,
} from "@/services/prevent-ia/health-score-engine";
import type {
  ConversationalAnswers,
  FunctionalAssessmentAnswers,
  HealthScoreModule,
  ProtocolKey,
} from "@/services/prevent-ia/protocols/base/PreventProtocol";
import { getReferenceRange } from "@/services/prevent-ia/reference-ranges";
import { SCENARIOS, type ScenarioKey } from "@/services/prevent-ia/scenarios";
import type {
  ClinicalResult,
  ClinicalTriggerPayload,
  PatientHistoryEntry,
  PreventIaResult,
} from "@/services/prevent-ia/types";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";

export interface DemoCustomExam {
  loincCode: string;
  value: number;
}

export interface AnalyzeDemoParams {
  scenario?: ScenarioKey;
  customExam?: DemoCustomExam;
  /** Edad autorizada por el visitante — si falta, se asume un adulto (EMPA) para no bloquear la demo. */
  age?: number;
  conversational: ConversationalAnswers;
  /** Solo la envía el chat cuando `PreventProtocolEngine` selecciona EMPAM. */
  functional?: FunctionalAssessmentAnswers;
}

export type AnalyzeDemoScenarioTag = ScenarioKey | "custom";

export interface AnalyzeDemoResponse {
  scenario: AnalyzeDemoScenarioTag;
  current: ClinicalResult;
  history: PatientHistoryEntry[];
  result: PreventIaResult;
  scoreTimeline: ScoreTimelinePoint[];
  /** Protocolo que `PreventProtocolEngine` determinó automáticamente — el visitante nunca lo elige. */
  protocol: ProtocolKey;
  /** Desglose del Health Score modular (Laboratorio, Factores de Riesgo, Hábitos, Información Conversacional y, en EMPAM, Evaluación Funcional). */
  healthScoreModules: HealthScoreModule[];
}

export type AnalyzeDemoResult =
  | { success: true; data: AnalyzeDemoResponse }
  | { success: false; error: string };

function formatReferenceRange(loincCode: string): string {
  const config = getReferenceRange(loincCode);
  if (!config) return "N/D";
  const [first] = config.bands;
  return first?.max !== undefined ? `< ${first.max} ${config.unit}` : "N/D";
}

/** Arma un `ClinicalTriggerPayload` sintético para un examen cargado manualmente en la demo — misma forma que un documento real, sin historial previo (la demo no simula controles pasados del visitante). */
function buildCustomPayload(
  customExam: DemoCustomExam,
): ClinicalTriggerPayload {
  const known = DEMO_EXAM_TYPES.find(
    (exam) => exam.loincCode === customExam.loincCode,
  );
  const offchain: ClinicalResult = {
    examType: known?.examType ?? "Examen de demo",
    loincCode: customExam.loincCode,
    value: customExam.value,
    unit: known?.unit ?? "",
    referenceRange: formatReferenceRange(customExam.loincCode),
  };
  const historialPrevio: PatientHistoryEntry[] = [];

  return {
    onchain: {
      documentId: `demo-${Date.now()}`,
      patient: "0xDemoVisitor",
      issuer: "0xDemoLanding",
      institution: "0xDemoLanding",
      documentType: "LAB_RESULT",
      clinicalHash: "0xdemo",
      episodeId: "0xdemo",
      cid: "demo://custom-exam",
      standard: "LOINC",
      classification: "DEMO_PUBLICA",
      createdAt: new Date().toISOString(),
    },
    offchain,
    historialPrevio,
  };
}

export async function analyzeDocumentDemo(
  params: AnalyzeDemoParams,
): Promise<AnalyzeDemoResult> {
  try {
    // Sin sesión que identifique al visitante: todos comparten el mismo bucket
    // de rate limit (ver limitación de `getClientIP()` en `rate-limit.ts`).
    await checkRateLimit("analyzeDocumentDemo", {
      windowMs: 60_000,
      maxRequests: 30,
    });

    let payload: ClinicalTriggerPayload;
    let scenarioTag: AnalyzeDemoScenarioTag;

    if (params.customExam) {
      payload = buildCustomPayload(params.customExam);
      scenarioTag = "custom";
    } else {
      const key =
        params.scenario && SCENARIOS[params.scenario]
          ? params.scenario
          : DEFAULT_SCENARIO;
      payload = SCENARIOS[key];
      scenarioTag = key;
    }

    // 1) PreventProtocolEngine determina el protocolo — nunca lo elige el visitante.
    const age = params.age ?? DEFAULT_ADULT_AGE;
    const protocol = selectProtocol({ age });

    // 2) El protocolo compone el motor de Health Score existente (Laboratorio +
    //    Factores de Riesgo) con sus módulos nuevos (Hábitos, Conversacional y,
    //    en EMPAM, Evaluación Funcional).
    const protocolAnalysis = protocol.analyze({
      current: payload.offchain,
      history: payload.historialPrevio,
      profile: { age },
      conversational: params.conversational,
      functional: params.functional,
    });

    // 3) El agente (Claude o plantilla, sin cambios) redacta el texto humano a
    //    partir del score ya calculado — se le pasa el breakdown de laboratorio
    //    original con el score/riesgo/explicación ya sobreescritos por el
    //    protocolo, para no tocar la firma de `runPreventIaAgent`.
    const labBreakdown = calculateHealthScore(
      payload.offchain,
      payload.historialPrevio,
    );
    const combinedBreakdown: HealthScoreBreakdown = {
      ...labBreakdown,
      healthScore: protocolAnalysis.healthScore.healthScore,
      riskLevel: protocolAnalysis.healthScore.riskLevel,
      scoreExplanation: protocolAnalysis.scoreExplanation,
    };
    const result = await runPreventIaAgent(payload, combinedBreakdown);

    // 4) La comparación longitudinal sigue mostrando la serie real de
    //    laboratorio; solo el punto actual se alinea con el score modular para
    //    que el gauge y el gráfico muestren el mismo número.
    const rawTimeline = buildScoreTimeline(
      payload.offchain,
      payload.historialPrevio,
      payload.onchain.createdAt,
    );
    const scoreTimeline = rawTimeline.map((point) =>
      point.isCurrent
        ? {
            ...point,
            healthScore: protocolAnalysis.healthScore.healthScore,
            riskLevel: protocolAnalysis.healthScore.riskLevel,
          }
        : point,
    );

    return {
      success: true,
      data: {
        scenario: scenarioTag,
        current: payload.offchain,
        history: payload.historialPrevio,
        result,
        scoreTimeline,
        protocol: protocol.key,
        healthScoreModules: protocolAnalysis.healthScore.modules,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    console.error("[analyzeDocumentDemo]", error);
    return {
      success: false,
      error: "No se pudo analizar el examen de demostración.",
    };
  }
}
