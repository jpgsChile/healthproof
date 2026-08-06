"use client";

import { useTranslations } from "next-intl";

/**
 * Banner discreto que se muestra únicamente cuando `NEXT_PUBLIC_PRIVY_APP_ID`
 * no está configurado (ver `app/providers.tsx`, que decide si montar
 * `<PrivyProvider>` o este Modo Demo). No bloquea la UI ni la navegación —
 * es una píldora fija y pequeña, no un modal ni una pantalla de error.
 */
export function DemoModeBanner() {
  const t = useTranslations("demoMode");

  return (
    // biome-ignore lint/a11y/useSemanticElements: es un aviso de estado global de la app (no un resultado de cálculo/formulario), <div role="status"> es el patrón ARIA estándar para esto.
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-100 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm"
    >
      {t("banner")}
    </div>
  );
}
