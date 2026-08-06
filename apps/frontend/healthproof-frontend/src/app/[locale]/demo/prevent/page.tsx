"use client";

/**
 * Demo pública de Prevent IA — sin autenticación, sin dashboard, sin datos
 * reales. Vive fuera de `dashboard/` a propósito: el gating de sesión vive en
 * `dashboard/layout.tsx`, así que esta ruta queda pública por construcción,
 * sin tocar ese layout ni el middleware.
 *
 * Reutiliza exactamente el mismo motor y componentes de `services/prevent-ia`
 * y `components/prevent-ia` que el dashboard autenticado — ver
 * `docs/prevent-ia-architecture.md` para el detalle de esa capa. Lo único
 * nuevo acá es la capa de presentación conversacional (`prevent-ia-demo/*`).
 */
import { useTranslations } from "next-intl";
import { DemoDataBanner } from "@/components/prevent-ia/DemoDataBanner";
import { DemoProvider } from "@/components/prevent-ia-demo/DemoProvider";
import { PreventIaDemoExperience } from "@/components/prevent-ia-demo/PreventIaDemoExperience";

export default function PreventIaPublicDemoPage() {
  const t = useTranslations("demoPreventIa");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-600">
          {t("badge")}
        </span>
      </div>
      <div className="mb-6">
        <DemoDataBanner />
      </div>

      <DemoProvider>
        <PreventIaDemoExperience />
      </DemoProvider>
    </main>
  );
}
