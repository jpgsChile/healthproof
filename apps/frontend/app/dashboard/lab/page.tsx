'use client';

import { useQuery } from '@tanstack/react-query';
import { LabDocumentUpload } from '@/components/lab/LabDocumentUpload';
import { LabDocumentTable } from '@/components/lab/LabDocumentTable';
import { useAuth } from '@/components/layout/Providers';
import { api } from '@/services/api';

export default function LabDashboardPage() {
  const { user, ready } = useAuth();

  const { data: issuer, isLoading: issuerLoading } = useQuery({
    queryKey: ['issuer', user?.walletAddress],
    queryFn: () => api.getIssuerByWallet(user!.walletAddress),
    enabled: !!user?.walletAddress,
  });

  const { data: documents = [], isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['documents', 'lab', user?.walletAddress],
    queryFn: () => api.getDocumentsByWallet(user!.walletAddress),
    enabled: !!user?.walletAddress,
  });

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-xl font-semibold mb-2">Acceso requerido</h2>
        <p className="text-muted-foreground">Conecta tu wallet para acceder al panel de laboratorio</p>
      </div>
    );
  }

  if (issuerLoading || !issuer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        {issuerLoading ? (
          <div className="animate-pulse text-muted-foreground">Verificando laboratorio...</div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Laboratorio no registrado</h2>
            <p className="text-muted-foreground">Tu wallet no está registrada como laboratorio</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Panel de Laboratorio</h1>
        <p className="text-muted-foreground">{issuer.name}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Registrar documento</h2>
        <LabDocumentUpload issuerId={issuer.id} onSuccess={() => refetch()} />
      </section>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Documentos registrados</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        {docsLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <LabDocumentTable documents={documents} />
        )}
      </section>
    </div>
  );
}
