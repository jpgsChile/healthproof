"use client";

/**
 * Paso inicial de la demo pública: elegir uno de los escenarios precargados
 * (reutiliza `ScenarioSwitcher`, el mismo componente del dashboard
 * autenticado) o cargar un examen propio (examType + valor) que se analiza
 * con el mismo motor real, sin historial previo.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ScenarioSwitcher } from "@/components/prevent-ia/ScenarioSwitcher";
import { Button } from "@/components/ui/Button";
import { DEMO_EXAM_TYPES } from "@/services/prevent-ia/demo-exam-types";
import type { ScenarioKey } from "@/services/prevent-ia/scenarios";
import { type DemoExamChoice, useDemo } from "./DemoProvider";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";

export function ExamSourcePicker() {
  const t = useTranslations("demoPreventIa");
  const { examChoice, selectExam, startAnalysis, analysis } = useDemo();

  const [customLoinc, setCustomLoinc] = useState<string>(
    DEMO_EXAM_TYPES[0].loincCode,
  );
  const [customValue, setCustomValue] = useState<string>(
    String(DEMO_EXAM_TYPES[0].exampleValue),
  );

  const scenarioActive =
    examChoice?.type === "scenario" ? examChoice.scenario : DEFAULT_SCENARIO;

  const handleSelectScenario = (scenario: ScenarioKey) => {
    selectExam({ type: "scenario", scenario });
  };

  const handleLoadCustom = () => {
    const parsedValue = Number(customValue);
    if (Number.isNaN(parsedValue)) return;
    selectExam({
      type: "custom",
      exam: { loincCode: customLoinc, value: parsedValue },
    } satisfies DemoExamChoice);
  };

  const isCustomLoaded =
    examChoice?.type === "custom" &&
    examChoice.exam.loincCode === customLoinc &&
    examChoice.exam.value === Number(customValue);

  const canStart = examChoice !== null;

  return (
    <div className="neu-shell border border-white/70 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
        {t("introEyebrow")}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
        {t("introTitle")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("introBody")}</p>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t("preloadedLabel")}
        </p>
        <ScenarioSwitcher
          active={scenarioActive}
          loading={analysis.loading}
          onSelect={handleSelectScenario}
        />
      </div>

      <div className="mt-6 neu-inset p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t("customLabel")}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            {t("customExamType")}
            <select
              value={customLoinc}
              onChange={(e) => setCustomLoinc(e.target.value)}
              className="neu-chip rounded-xl px-3 py-2 text-sm text-slate-700"
            >
              {DEMO_EXAM_TYPES.map((exam) => (
                <option key={exam.loincCode} value={exam.loincCode}>
                  {exam.examType}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            {t("customValue")}
            <input
              type="number"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="neu-chip w-28 rounded-xl px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadCustom}
            disabled={analysis.loading}
          >
            {isCustomLoaded ? t("customLoaded") : t("customLoadButton")}
          </Button>
        </div>
      </div>

      {analysis.error && (
        <p className="mt-4 text-sm text-red-600">{analysis.error}</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          disabled={!canStart || analysis.loading}
          loading={analysis.loading}
          onClick={startAnalysis}
        >
          {t("runButton")}
        </Button>
      </div>
    </div>
  );
}
