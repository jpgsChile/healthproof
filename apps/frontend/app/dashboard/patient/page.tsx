'use client';

import { DocumentList } from '@/components/document/DocumentList';
import { useAuth } from '@/components/layout/Providers';

export default function PatientDashboardPage() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="animate-pulse">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Conecta tu wallet para ver tus documentos</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Documentos</h1>
      <p className="text-muted-foreground mb-8">
        Documentos médicos verificados asociados a tu wallet
      </p>
      <DocumentList walletAddress={user.walletAddress} />
    </div>
  );
}
