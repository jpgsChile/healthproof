'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { DocumentRecord } from '@/services/api';
import { cn } from '@/components/ui/cn';

const SNOWTRACE_URL = 'https://testnet.snowtrace.io/tx';

type DocumentStatus = 'pending' | 'verified' | 'revoked';

function getStatus(doc: DocumentRecord): DocumentStatus {
  if (doc.revoked) return 'revoked';
  if (!doc.txHash) return 'pending';
  return 'verified';
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    revoked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const labels = {
    pending: 'Pendiente',
    verified: 'Verificado',
    revoked: 'Revocado',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function VerificationQR({ documentHash, onClose }: { documentHash: string; onClose: () => void }) {
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify?hash=${encodeURIComponent(documentHash)}`
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Código QR de verificación</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            ✕
          </button>
        </div>
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG value={verifyUrl} size={200} level="M" includeMargin />
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Escanea para verificar en blockchain
        </p>
      </div>
    </div>
  );
}

interface LabDocumentTableProps {
  documents: DocumentRecord[];
}

export function LabDocumentTable({ documents }: LabDocumentTableProps) {
  const [qrDoc, setQrDoc] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">No hay documentos registrados</p>
        <p className="text-sm text-muted-foreground mt-1">Sube un documento para comenzar</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left text-sm font-medium px-6 py-4">Hash</th>
              <th className="text-left text-sm font-medium px-6 py-4">Estado</th>
              <th className="text-left text-sm font-medium px-6 py-4">Transacción</th>
              <th className="text-left text-sm font-medium px-6 py-4">Fecha</th>
              <th className="text-right text-sm font-medium px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const status = getStatus(doc);
              return (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-xs font-mono text-muted-foreground">
                      {doc.documentHash.slice(0, 12)}...{doc.documentHash.slice(-8)}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-6 py-4">
                    {doc.txHash ? (
                      <a
                        href={`${SNOWTRACE_URL}/${doc.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline font-mono"
                      >
                        {doc.txHash.slice(0, 10)}...{doc.txHash.slice(-8)}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setQrDoc(doc.documentHash)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Generar QR
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {qrDoc && (
        <VerificationQR documentHash={qrDoc} onClose={() => setQrDoc(null)} />
      )}
    </>
  );
}
