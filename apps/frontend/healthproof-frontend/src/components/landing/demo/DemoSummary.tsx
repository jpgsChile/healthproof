"use client";

import { Check, FlaskConical, Shield, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

interface DemoSummaryProps {
  onClose: () => void;
}

export function DemoSummary({ onClose }: DemoSummaryProps) {
  const t = useTranslations("demoFlow");
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const steps = [
    {
      icon: <User className="h-4 w-4 text-sky-500" />,
      title: t("summaryStep1"),
      color: "bg-sky-50 border-sky-200",
    },
    {
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      title: t("summaryStep2"),
      color: "bg-emerald-50 border-emerald-200",
    },
    {
      icon: <FlaskConical className="h-4 w-4 text-indigo-500" />,
      title: t("summaryStep3"),
      color: "bg-indigo-50 border-indigo-200",
    },
    {
      icon: <Check className="h-4 w-4 text-emerald-500" />,
      title: t("summaryStep4"),
      color: "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <aside
      id="hero-demo-summary"
      className="hero-demo-panel hero-demo-summary"
      aria-labelledby="hero-summary-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Header */}
      <div className="hero-demo-panel-header flex items-center justify-between border-b border-(--hp-border) px-6 py-4">
        <h2
          id="hero-summary-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-slate-800 outline-none"
        >
          {t("summaryTitle")}
        </h2>
        <button
          onClick={onClose}
          className="hero-panel-close rounded-full p-1 text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
          aria-label={t("close")}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="hero-demo-panel-body px-6 py-5">
        <p className="text-sm text-slate-600">{t("summaryDesc")}</p>

        <div className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 ${s.color}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{s.title}</p>
                <p className="text-[10px] text-slate-500">
                  {t("summaryStepNumber", { number: i + 1 })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            {t("summaryConclusion")}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {t("summaryConclusionSub")}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="hero-demo-panel-footer flex flex-col gap-2 border-t border-(--hp-border) px-6 py-4">
        <Button
          size="lg"
          variant="primary"
          className="w-full"
          onClick={() => router.push("/auth")}
        >
          {t("tryItNow")}
        </Button>
        <Button size="sm" variant="ghost" className="w-full" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </aside>
  );
}
