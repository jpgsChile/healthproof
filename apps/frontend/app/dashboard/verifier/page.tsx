'use client';

import { DocumentVerify } from '@/components/document/DocumentVerify';
import { useAuth } from '@/components/layout/Providers';

export default function VerifierDashboardPage() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="animate-pulse">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Conecta tu wallet para verificar documentos</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel Verificador</h1>
      <p className="text-muted-foreground mb-8">
        Verifica la autenticidad de documentos médicos en blockchain
      </p>
      <DocumentVerify verifierId={user.id} />
    </div>
  );
}
