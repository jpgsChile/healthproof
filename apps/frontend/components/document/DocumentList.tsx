'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DocumentListProps {
  walletAddress: string;
}

export function DocumentList({ walletAddress }: DocumentListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', walletAddress],
    queryFn: () => api.getDocumentsByWallet(walletAddress),
    enabled: !!walletAddress,
  });

  if (isLoading) return <div className="animate-pulse">Cargando documentos...</div>;
  if (error) return <div className="text-red-600">Error al cargar documentos</div>;
  if (!data?.length) return <p className="text-muted-foreground">No hay documentos</p>;

  return (
    <ul className="space-y-4">
      {data.map((doc) => (
        <li
          key={doc.id}
          className="p-4 border rounded-lg flex justify-between items-center"
        >
          <div>
            <p className="font-mono text-sm">{doc.documentHash.slice(0, 16)}...</p>
            <p className="text-xs text-muted-foreground">
              {doc.revoked ? 'Revocado' : 'Verificado'} · {doc.createdAt}
            </p>
          </div>
          {doc.txHash && (
            <a
              href={`https://testnet.snowtrace.io/tx/${doc.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Ver en Avalanche
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
