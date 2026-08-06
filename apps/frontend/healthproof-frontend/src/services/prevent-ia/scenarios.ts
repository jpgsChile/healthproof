/**
 * Escenarios mock, con la forma real de un trigger clínico (ver `types.ts`).
 *
 * Módulo plano a propósito: tanto `analyze-document.ts` (server action
 * autenticada) como `analyze-document-demo.ts` (server action pública de la
 * demo) son archivos `"use server"`, y esos solo pueden exportar funciones
 * async — un objeto/constante exportado desde ahí llega `undefined` en el
 * cliente y rompe el build ("A 'use server' file can only export async
 * functions"). Por eso `SCENARIOS` vive en su propio archivo, importado por
 * ambas server actions.
 */
import mockScenarios from "./mock/mock-clinical-results.json";
import type { ClinicalTriggerPayload } from "./types";

export type ScenarioKey =
  | "escenario_riesgo_bajo"
  | "escenario_riesgo_en_ascenso"
  | "escenario_riesgo_alto";

export const SCENARIOS = mockScenarios as unknown as Record<
  ScenarioKey,
  ClinicalTriggerPayload
>;
