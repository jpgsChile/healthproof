"use client";

import { HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Bloque de CTA hacia la demo pública de Prevent IA (`/demo/prevent`) — no requiere cuenta ni login. */
export function PreventIaCtaSection() {
  const t = useTranslations("preventIaCta");

  return (
    <div className="neu-shell border border-white/70 p-7 text-center sm:p-9">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
        <HeartPulse className="h-6 w-6 text-sky-600" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {t("eyebrow")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">
        {t("title")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
        {t("description")}
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/demo/prevent">
          <Button className="min-w-[260px] cursor-pointer" size="lg">
            {t("button")}
          </Button>
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">{t("noAccountNeeded")}</p>
    </div>
  );
}
