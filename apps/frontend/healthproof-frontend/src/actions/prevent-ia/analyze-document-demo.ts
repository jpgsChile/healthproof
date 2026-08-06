"use server";

/**
 * Entrada PÚBLICA (sin autenticación) al mismo caso de uso de
 * `analyze-document.ts`: motor de Health Score + agente Prevent IA.
 *
 * Existe para la demo pública (`/demo/prevent`, ver plan "Arquitecto
 * Principal") donde un visitante sin cuenta puede probar Prevent IA. No se
 * duplica ninguna regla de negocio: se reutiliza `runPreventIaAnalysis()` y
 * `SCENARIOS`, exportados desde `analyze-document.ts` — el server action
 * autenticado (`analyzeDocument`) no se modifica ni cambia su contrato.
 *
 * Nunca toca datos reales: solo opera sobre los escenarios mock existentes
 * o sobre un examen "custom" armado en memoria con la forma de
 * `ClinicalTriggerPayload` (mismo tipo que usa el flujo real), sin historial
 * clínico real y sin ninguna escritura a Supabase/on-chain.
 */
import { checkRateLimit, RateLimitError } from "@/lib/auth/rate-limit";
import { DEMO_EXAM_TYPES } from "@/services/prevent-ia/demo-exam-types";
import { getReferenceRange } from "@/services/prevent-ia/reference-ranges";
import { SCENARIOS, type ScenarioKey } from "@/services/prevent-ia/scenarios";
import type {
  ClinicalResult,
  ClinicalTriggerPayload,
  PatientHistoryEntry,
} from "@/services/prevent-ia/types";
import {
  type AnalyzeDocumentResponse,
  runPreventIaAnalysis,
} from "./analyze-document";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";

export interface DemoCustomExam {
  loincCode: string;
  value: number;
}

export interface AnalyzeDemoParams {
  scenario?: ScenarioKey;
  customExam?: DemoCustomExam;
}

export type AnalyzeDemoScenarioTag = ScenarioKey | "custom";

export interface AnalyzeDemoResponse
  extends Omit<AnalyzeDocumentResponse, "scenario"> {
  scenario: AnalyzeDemoScenarioTag;
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

    const { result, scoreTimeline } = await runPreventIaAnalysis(payload);

    return {
      success: true,
      data: {
        scenario: scenarioTag,
        current: payload.offchain,
        history: payload.historialPrevio,
        result,
        scoreTimeline,
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
