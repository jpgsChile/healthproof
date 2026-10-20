"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Dispatch, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui";
import {
  DoctorOrderStep,
  LabUploadStep,
  PatientSelectLabStep,
  PatientShareStep,
  StepIndicator,
  TimelineStep,
} from "./demo";
import {
  DemoPrimaryAction,
  DemoPrimaryActionProvider,
} from "./demo/DemoPrimaryAction";
import {
  DEMO_STEP_KEYS,
  type DemoPhase,
  type HeroDemoAction,
  type HeroDemoState,
} from "./demo/hero-demo-flow";

interface HeroDemoPanelProps {
  state: HeroDemoState;
  onAction: Dispatch<HeroDemoAction>;
  onClose: () => void;
  onFinish: () => void;
}

export function HeroDemoPanel({
  state,
  onAction,
  onClose,
  onFinish,
}: HeroDemoPanelProps) {
  const t = useTranslations("demoFlow");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { step, completed } = state;
  const labels = DEMO_STEP_KEYS.map((key) => t(key));
  const completions = useMemo(
    () =>
      DEMO_STEP_KEYS.map(
        (_, index) => () => onAction({ type: "complete", step: index }),
      ),
    [onAction],
  );
  const onLabPhase = useCallback(
    (phase: DemoPhase) => {
      onAction({ type: "phase", step: 2, phase });
    },
    [onAction],
  );
  const onOrderPhase = useCallback(
    (phase: DemoPhase) => onAction({ type: "phase", step: 0, phase }),
    [onAction],
  );
  const onPermissionPhase = useCallback(
    (phase: DemoPhase) => {
      onAction({ type: "phase", step: 1, phase });
    },
    [onAction],
  );
  const onPatientPhase = useCallback(
    (phase: DemoPhase) => {
      onAction({ type: "phase", step: 3, phase });
    },
    [onAction],
  );

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const handleNext = () => {
    if (!completed[step]) return;
    onAction({ type: "next" });
    if (step === labels.length - 1) onFinish();
  };

  const handleBack = () => {
    if (step > 0) {
      onAction({ type: "back" });
    } else {
      onClose();
    }
  };

  return (
    <DemoPrimaryActionProvider step={step}>
      <aside
        id="hero-demo-panel"
        className="hero-demo-panel"
        aria-labelledby="hero-demo-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="hero-demo-panel-header flex items-center justify-between border-b border-(--hp-border) px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2
              id="hero-demo-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-slate-800 outline-none"
            >
              {t("modalTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hero-panel-close rounded-full p-1 text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
            aria-label={t("close")}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 pt-3 text-xs leading-relaxed text-slate-500">
          {t("simulationNotice")}
        </p>

        <StepIndicator current={step} labels={labels} completed={completed} />

        <div className="hero-demo-panel-body px-6 py-5">
          {step === 0 && (
            <DoctorOrderStep
              onComplete={completions[0]}
              completed={completed[0]}
              onPhaseChange={onOrderPhase}
            />
          )}
          {step === 1 && (
            <PatientSelectLabStep
              onComplete={completions[1]}
              onPhaseChange={onPermissionPhase}
              isGranted={state.phase === "lab-assigned"}
              completed={completed[1]}
            />
          )}
          {step === 2 && (
            <LabUploadStep
              onComplete={completions[2]}
              onPhaseChange={onLabPhase}
              completed={completed[2]}
            />
          )}
          {step === 3 && (
            <PatientShareStep
              onComplete={completions[3]}
              onPhaseChange={onPatientPhase}
              completed={completed[3]}
            />
          )}
          {step === 4 && <TimelineStep onComplete={completions[4]} />}
        </div>

        <div className="hero-demo-panel-footer flex items-center justify-between border-t border-(--hp-border) px-6 py-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            {step === 0 ? t("close") : t("back")}
          </Button>
          <DemoPrimaryAction
            initialLabel={t(
              [
                "createOrder",
                "authorizeLab",
                "prepareUpload",
                "viewResult",
                "finishDemo",
              ][step],
            )}
            completed={completed[step] || step === 4}
            continueLabel={
              step === labels.length - 1 ? t("finishDemo") : t("continueDemo")
            }
            onContinue={handleNext}
          />
        </div>
      </aside>
    </DemoPrimaryActionProvider>
  );
}
