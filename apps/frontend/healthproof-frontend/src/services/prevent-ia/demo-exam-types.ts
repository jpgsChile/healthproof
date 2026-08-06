/**
 * Catálogo de exámenes que la demo pública permite cargar manualmente.
 *
 * Módulo plano (sin "use server"/"use client") a propósito: lo importan tanto
 * la server action de la demo (`actions/prevent-ia/analyze-document-demo.ts`)
 * como el picker de UI (`components/prevent-ia-demo/ExamSourcePicker.tsx`).
 * Un `"use server"` file solo puede exportar funciones async — un array
 * exportado desde ahí llega `undefined` en el cliente.
 *
 * Solo se listan los dos exámenes con rango de referencia real configurado
 * en `reference-ranges.ts`, para que la clasificación de riesgo en la demo
 * sea real y no inventada.
 */
export const DEMO_EXAM_TYPES = [
  {
    loincCode: "1558-6",
    examType: "Glicemia en ayunas",
    unit: "mg/dL",
    exampleValue: 92,
  },
  {
    loincCode: "13457-7",
    examType: "Colesterol LDL",
    unit: "mg/dL",
    exampleValue: 130,
  },
] as const;
