"use client";

/**
 * Hook cliente para la demo pública de Prevent IA — mismo espíritu que
 * `usePreventIaAnalysis` (loading/error/data), pero:
 *   - dispara el análisis manualmente (`run(...)`), no al montar, porque en
 *     la demo el visitante primero elige o carga un examen;
 *   - llama a `analyzeDocumentDemo` (server action pública, sin auth) en vez
 *     de `analyzeDocument`;
 *   - no cachea en `sessionStorage`: cada corrida de la demo debe reflejar
 *     exactamente lo que el visitante elegió, sin resultados obsoletos.
 */
import { useCallback, useState } from "react";
import {
  type AnalyzeDemoParams,
  type AnalyzeDemoResponse,
  analyzeDocumentDemo,
} from "@/actions/prevent-ia/analyze-document-demo";

export function useDemoPreventIaAnalysis() {
  const [data, setData] = useState<AnalyzeDemoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: AnalyzeDemoParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyzeDocumentDemo(params);
      if (response.success) {
        setData(response.data);
        return response.data;
      }
      setError(response.error);
      return null;
    } catch (err) {
      console.error("[useDemoPreventIaAnalysis]", err);
      setError("No se pudo analizar el examen de demostración.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset };
}
