"use client";

import {
  Check,
  FileText,
  FlaskConical,
  Share2,
  Shield,
  Stethoscope,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { generateMockHash, getNextBlockNumber } from "./mock-data";

interface TimelineStepProps {
  onComplete: () => void;
}

export function TimelineStep({ onComplete }: TimelineStepProps) {
  const t = useTranslations("demoFlow");
  const [records] = useState(() =>
    Array.from({ length: 4 }, () => ({
      hash: generateMockHash(),
      block: getNextBlockNumber(),
    })),
  );

  useEffect(() => {
    onComplete();
  }, [onComplete]);

  const events = [
    {
      icon: <Stethoscope className="h-4 w-4 text-sky-500" />,
      title: t("timelineOrderCreated"),
      actor: t("doctorRole"),
      ...records[0],
    },
    {
      icon: <FlaskConical className="h-4 w-4 text-indigo-500" />,
      title: t("timelineResultUploaded"),
      actor: t("labRole"),
      ...records[1],
    },
    {
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      title: t("timelinePatientViewed"),
      actor: t("patientRole"),
      ...records[2],
    },
    {
      icon: <Share2 className="h-4 w-4 text-sky-500" />,
      title: t("timelineShared"),
      actor: t("patientRole"),
      ...records[3],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <FileText className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t("timelineTitle")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("timelineDesc")}</p>

      <ol className="hero-timeline">
        {events.map((ev) => (
          <li key={ev.title} className="hero-timeline-event">
            <div className="shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                {ev.icon}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-700">{ev.title}</p>
              <p className="text-xs text-slate-400">{ev.actor}</p>
              <details className="hero-timeline-details">
                <summary>{t("eventDetails")}</summary>
                <dl>
                  <dt>{t("txHashLabel")}</dt>
                  <dd>{ev.hash}</dd>
                  <dt>{t("blockLabel")}</dt>
                  <dd>#{ev.block}</dd>
                </dl>
              </details>
            </div>
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
