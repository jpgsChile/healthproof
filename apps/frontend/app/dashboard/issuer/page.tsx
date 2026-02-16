'use client';

import { useQuery } from '@tanstack/react-query';
import { DocumentUpload } from '@/components/document/DocumentUpload';
import { useAuth } from '@/components/layout/Providers';
import { api } from '@/services/api';

export default function IssuerDashboardPage() {
  const { user, ready } = useAuth();

  const { data: issuer, isLoading: issuerLoading } = useQuery({
    queryKey: ['issuer', user?.walletAddress],
    queryFn: () => api.getIssuerByWallet(user!.walletAddress),
    enabled: !!user?.walletAddress,
  });

  if (!ready) {
    return <div className="animate-pulse">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Conecta tu wallet para continuar</p>
      </div>
    );
  }

  if (issuerLoading) {
    return <div className="animate-pulse">Verificando emisor...</div>;
  }

  if (!issuer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Tu wallet no está registrada como emisor. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel Emisor</h1>
      <p className="text-muted-foreground mb-8">
        Sube documentos médicos para registrarlos en blockchain
      </p>
      <DocumentUpload issuerId={issuer.id} />
    </div>
  );
}
