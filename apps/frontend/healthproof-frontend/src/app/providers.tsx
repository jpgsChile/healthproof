"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RecoveryCodeModal } from "@/components/auth/RecoveryCodeModal";
import { RecoveryInputModal } from "@/components/auth/RecoveryInputModal";
import { RegenerateKeysModal } from "@/components/auth/RegenerateKeysModal";
import { DemoModeBanner } from "@/components/feedback/DemoModeBanner";
import { KeyConflictBanner } from "@/components/feedback/KeyConflictBanner";
import { PrivyErrorBoundary } from "@/components/feedback/PrivyErrorBoundary";
import { RpcHealthBanner } from "@/components/feedback/RpcHealthBanner";
import { useSwitchToHygieia } from "@/hooks/admin/useSwitchToHygieia";
import { useSyncKeys } from "@/hooks/auth/useSyncKeys";
import { useSyncWallet } from "@/hooks/auth/useSyncWallet";
import { useUpsertUser } from "@/hooks/auth/useUpsertUser";
import { useRegisterIdentity } from "@/hooks/healthcare-networks/useRegisterIdentity";
import { wagmiConfig } from "@/lib/wagmi";
import { setTokenGetter } from "@/services/api/interceptors";
import { useKeyConflictStore } from "@/state/key-conflict.store";

const queryClient = new QueryClient();

function PrivyTokenSync({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  useUpsertUser();
  useSyncWallet();
  useSwitchToHygieia();
  const {
    recoveryState,
    recoverWithCode,
    dismissRecoveryCode,
    regenerateKeys,
  } = useSyncKeys();
  useRegisterIdentity();

  const [forceRecoveryInput, setForceRecoveryInput] = useState(false);
  const requestRegenerate = useKeyConflictStore((s) => s.requestRegenerate);
  const setRequestRegenerate = useKeyConflictStore(
    (s) => s.setRequestRegenerate,
  );

  const showRecoveryInput =
    recoveryState.step === "needs_input" || forceRecoveryInput;
  const showRegenerate =
    (recoveryState.needsRegeneration || requestRegenerate) &&
    !forceRecoveryInput &&
    recoveryState.step !== "show_recovery_code";

  const handleDismissRegenerate = () => {
    setRequestRegenerate(false);
    dismissRecoveryCode();
  };

  const handleRegenerate = async () => {
    const ok = await regenerateKeys();
    if (ok) {
      setRequestRegenerate(false);
    }
    return ok;
  };

  return (
    <>
      <RpcHealthBanner />
      <KeyConflictBanner />
      {recoveryState.step === "show_recovery_code" &&
        recoveryState.recoveryCode && (
          <RecoveryCodeModal
            recoveryCode={recoveryState.recoveryCode}
            onDismiss={dismissRecoveryCode}
          />
        )}
      {showRecoveryInput && (
        <RecoveryInputModal
          onRecover={recoverWithCode}
          onDismiss={() => {
            setForceRecoveryInput(false);
            dismissRecoveryCode();
          }}
        />
      )}
      {showRegenerate && (
        <RegenerateKeysModal
          onRegenerate={handleRegenerate}
          onDismiss={handleDismissRegenerate}
          onSwitchToRecovery={() => setForceRecoveryInput(true)}
        />
      )}
      {children}
    </>
  );
}

/**
 * Único chequeo que decide el modo: mismo criterio "vacío = inválido" que
 * hoy hace que `<PrivyProvider appId="">` lance "Cannot initialize the
 * Privy provider with an invalid Privy app ID". Revertir a Privy real es
 * automático — no hay ningún flag que apagar, solo configurar el env var.
 */
function hasValidPrivyAppId(appId: string | undefined): appId is string {
  return typeof appId === "string" && appId.trim().length > 0;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Modo Demo: sin App ID válido, nunca montamos <PrivyProvider> (evita el
  // throw síncrono de Privy) y renderizamos la app igual, con un banner
  // discreto. Wallet/login quedan deshabilitados — el resto de la app (Nav,
  // MobileSheet, landing, demo pública, etc.) sigue funcionando: usan
  // `useSafePrivy()` en vez de `usePrivy()` para no depender del Provider.
  if (!hasValidPrivyAppId(appId)) {
    return (
      <QueryClientProvider client={queryClient}>
        <DemoModeBanner />
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyErrorBoundary>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email", "wallet", "google"],
          appearance: {
            theme: "light",
            accentColor: "#93C5FD",
            logo: "/images/logo/healthproof-logo.png",
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <PrivyTokenSync>{children}</PrivyTokenSync>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}
