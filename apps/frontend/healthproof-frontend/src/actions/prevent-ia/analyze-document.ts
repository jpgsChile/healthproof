"use server";

/**
 * Corre el ciclo completo de Prevent IA (motor de Health Score + agente) sobre
 * un escenario mock con el shape exacto del trigger real (`DocumentRegistered`
 * en `MedicalDocumentRegistry`, ver `src/services/prevent-ia/types.ts`).
 *
 * Limitación de fondo: el contenido clínico se cifra en el cliente antes de
 * subirse (`document_secrets`, sin PHI en claro en servidor) — un server action
 * no puede hoy leer los valores clínicos de un documento real recién subido.
 * Por eso esta acción corre sobre escenarios mock con forma real en vez de
 * sobre un documento real; conectar el trigger real requiere primero decidir
 * dónde corre el análisis (cliente, justo después del descifrado, o con una
 * identidad propia de Prevent IA como grantee de `PermissionManager`).
 */
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { runPreventIaAgent } from "@/services/prevent-ia/agent";
import {
  buildScoreTimeline,
  calculateHealthScore,
  type ScoreTimelinePoint,
} from "@/services/prevent-ia/health-score-engine";
import type { ScenarioKey } from "@/services/prevent-ia/scenarios";
import { SCENARIOS } from "@/services/prevent-ia/scenarios";
import type {
  ClinicalResult,
  ClinicalTriggerPayload,
  PatientHistoryEntry,
  PreventIaResult,
} from "@/services/prevent-ia/types";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";

interface AnalyzeDocumentParams {
  scenario?: ScenarioKey;
}

export interface AnalyzeDocumentResponse {
  scenario: ScenarioKey;
  current: ClinicalResult;
  history: PatientHistoryEntry[];
  result: PreventIaResult;
  /** Serie de Health Score por EMPA (controles previos + el EMPA actual) — ver `buildScoreTimeline`. */
  scoreTimeline: ScoreTimelinePoint[];
}

/**
 * Núcleo del caso de uso "analizar un resultado clínico": motor de reglas +
 * agente. Extraído de `analyzeDocumentHandler` para que la demo pública
 * (`analyze-document-demo.ts`) pueda ejecutar exactamente la misma lógica
 * sobre un payload propio (custom o mock), sin duplicarla y sin pasar por
 * `withAuth` — el contrato de `analyzeDocument` (el server action autenticado)
 * no cambia.
 */
export async function runPreventIaAnalysis(
  payload: ClinicalTriggerPayload,
): Promise<{
  result: PreventIaResult;
  scoreTimeline: ScoreTimelinePoint[];
}> {
  const breakdown = calculateHealthScore(
    payload.offchain,
    payload.historialPrevio,
  );
  const result = await runPreventIaAgent(payload, breakdown);
  const scoreTimeline = buildScoreTimeline(
    payload.offchain,
    payload.historialPrevio,
    payload.onchain.createdAt,
  );

  return { result, scoreTimeline };
}

async function analyzeDocumentHandler(
  data: AnalyzeDocumentParams,
  _auth: AuthContext,
): Promise<AnalyzeDocumentResponse> {
  const scenarioKey =
    data.scenario && SCENARIOS[data.scenario]
      ? data.scenario
      : DEFAULT_SCENARIO;
  const payload = SCENARIOS[scenarioKey];

  const { result, scoreTimeline } = await runPreventIaAnalysis(payload);

  return {
    scenario: scenarioKey,
    current: payload.offchain,
    history: payload.historialPrevio,
    result,
    scoreTimeline,
  };
}

export const analyzeDocument = withAuth(analyzeDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
