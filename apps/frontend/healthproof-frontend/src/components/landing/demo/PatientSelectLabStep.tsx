"use client";

import { Check, FileText, FlaskConical, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { BlockchainConfirmation } from "./BlockchainConfirmation";
import { useDemoPrimaryAction } from "./DemoPrimaryAction";
import type { DemoPhase } from "./hero-demo-flow";
import { DEMO_PATIENTS } from "./mock-data";

interface PatientSelectLabStepProps {
  onComplete: () => void;
  onPhaseChange?: (phase: DemoPhase) => void;
  isGranted?: boolean;
  completed?: boolean;
}

export function PatientSelectLabStep({
  onComplete,
  onPhaseChange,
  isGranted = false,
  completed = false,
}: PatientSelectLabStepProps) {
  const t = useTranslations("demoFlow");
  const [selectedLab, setSelectedLab] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [granted, setGranted] = useState(completed);
  const authorize = () => {
    setConfirmed(true);
    onPhaseChange?.("permission-pending");
  };
  const inHero = useDemoPrimaryAction({
    label: t(confirmed && !granted ? "authorizingLab" : "authorizeLab"),
    run: authorize,
    busy: confirmed && !granted,
    complete: granted,
  });
  const finish = useCallback(() => {
    setGranted(true);
    onComplete();
  }, [onComplete]);

  const labs = [
    { name: "Lab Central", location: "Santiago" },
    { name: "BioScan Labs", location: "Valparaíso" },
    { name: "MediTest", location: "Concepción" },
  ];

  if (confirmed) {
    return (
      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isGranted ? "border-emerald-200 bg-emerald-50/60 text-emerald-700" : "border-sky-200 bg-sky-50/60 text-sky-700"}`}
        >
          {isGranted ? (
            <Check className="h-4 w-4" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          {t(isGranted ? "labAssigned" : "permissionPending")}:{" "}
          {labs[selectedLab].name}
        </div>
        <BlockchainConfirmation action="patient" onComplete={finish} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-700">
        <Shield className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t("patientRole")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("patientSelectLabDesc")}</p>

      <div className="rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <FileText className="h-4 w-4" />
          <p className="text-[10px] font-medium uppercase tracking-wide">
            {t("pendingOrder")}
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-700">
          {DEMO_PATIENTS[0].name} — {t("examCBC")}
        </p>
        <p className="text-xs text-slate-400">{t("orderedBy")}: Dr. Silva</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t("selectLab")}
        </p>
        {labs.map((lab, i) => (
          <button
            key={lab.name}
            onClick={() => {
              setSelectedLab(i);
              setGranted(false);
            }}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              selectedLab === i
                ? "border-emerald-300 bg-emerald-50 shadow-(--hp-shadow-raised)"
                : "border-(--hp-border) bg-(--hp-layer) hover:bg-white"
            }`}
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{lab.name}</p>
              <p className="text-xs text-slate-400">{lab.location}</p>
            </div>
          </button>
        ))}
      </div>

      {!inHero && (
        <button
          type="button"
          onClick={authorize}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white shadow-(--hp-shadow-raised) transition hover:bg-slate-700"
        >
          {t("assignLab")}
        </button>
      )}
    </div>
  );
}
