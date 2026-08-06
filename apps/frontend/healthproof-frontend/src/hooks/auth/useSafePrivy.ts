"use client";

/**
 * Wrappers "a prueba de fallos" sobre los hooks de `@privy-io/react-auth`.
 *
 * Cuando `NEXT_PUBLIC_PRIVY_APP_ID` no está configurado, `app/providers.tsx`
 * no monta `<PrivyProvider>` (Modo Demo) — en ese caso, los hooks reales de
 * Privy (`usePrivy`, `useLoginWithEmail`, etc.) lanzan
 * `PrivyClientError: "... must be used within a PrivyProvider"` apenas se
 * llaman, aunque el componente que los usa (`Nav`, `MobileSheet`, el gate de
 * `dashboard/layout.tsx`, la página de login) no tenga nada que ver con la
 * causa real.
 *
 * Estos wrappers delegan 100% al hook real cuando el contexto existe — cero
 * diferencia de comportamiento con Privy configurado — y devuelven valores
 * por defecto seguros (no autenticado, funciones no-op) cuando no.
 * Reversible sin tocar código: apenas exista un App ID válido, el
 * `try` nunca cae al `catch`.
 */
import {
  useLoginWithEmail as usePrivyLoginWithEmail,
  usePrivy as usePrivyReal,
} from "@privy-io/react-auth";

type PrivyState = ReturnType<typeof usePrivyReal>;
type LoginWithEmailState = ReturnType<typeof usePrivyLoginWithEmail>;

function warnDemoMode(action: string): void {
  console.warn(
    `[Modo Demo] "${action}" deshabilitado — configurá NEXT_PUBLIC_PRIVY_APP_ID para habilitar wallet/login.`,
  );
}

/** Mismo shape que devuelve `usePrivy()`, pero inerte: `ready` en `true` para no dejar a los consumidores en un loading infinito, `authenticated` en `false`. Solo se completan los campos que los consumidores actuales (`Nav`, `MobileSheet`, `dashboard/layout.tsx`, `auth/page.tsx`) realmente usan. */
function buildFallbackPrivyState(): PrivyState {
  return {
    ready: true,
    authenticated: false,
    user: null,
    login: () => warnDemoMode("login"),
    logout: async () => warnDemoMode("logout"),
    getAccessToken: async () => null,
  } as unknown as PrivyState;
}

function buildFallbackLoginWithEmailState(): LoginWithEmailState {
  return {
    state: { status: "initial" },
    sendCode: async () => {
      warnDemoMode("sendCode");
      throw new Error("Wallet/login deshabilitado en Modo Demo.");
    },
    loginWithCode: async () => {
      warnDemoMode("loginWithCode");
      throw new Error("Wallet/login deshabilitado en Modo Demo.");
    },
  } as unknown as LoginWithEmailState;
}

export function useSafePrivy(): PrivyState {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: se llama siempre y en la misma posición en cada render de este hook — el try/catch no lo vuelve condicional, solo intercepta el throw síncrono de Privy cuando falta el Provider.
    return usePrivyReal();
  } catch {
    return buildFallbackPrivyState();
  }
}

export function useSafeLoginWithEmail(): LoginWithEmailState {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: ídem useSafePrivy.
    return usePrivyLoginWithEmail();
  } catch {
    return buildFallbackLoginWithEmailState();
  }
}
