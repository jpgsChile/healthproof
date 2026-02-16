'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { blockchainService } from '@/services/blockchain';

interface DocumentVerifyProps {
  verifierId: string;
}

export function DocumentVerify({ verifierId }: DocumentVerifyProps) {
  const [documentHash, setDocumentHash] = useState('');

  const mutation = useMutation({
    mutationFn: () => blockchainService.verifyDocument(documentHash),
    enabled: !!documentHash,
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentHash.trim()) mutation.mutate();
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-2">Hash del documento</label>
        <input
          type="text"
          value={documentHash}
          onChange={(e) => setDocumentHash(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !documentHash.trim()}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {mutation.isPending ? 'Verificando...' : 'Verificar en blockchain'}
      </button>
      {mutation.isSuccess && mutation.data && (
        <div
          className={`p-4 rounded-md text-sm ${
            mutation.data.exists ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {mutation.data.exists ? (
            <>
              <p className="font-medium">Documento verificado</p>
              <p className="text-xs mt-1">Emisor: {mutation.data.issuer}</p>
              <p className="text-xs">Timestamp: {mutation.data.timestamp.toString()}</p>
            </>
          ) : (
            <p>Documento no encontrado o revocado</p>
          )}
        </div>
      )}
      {mutation.isError && (
        <div className="p-4 rounded-md bg-red-50 text-red-800 text-sm">
          {mutation.error instanceof Error ? mutation.error.message : 'Error'}
        </div>
      )}
    </form>
  );
}
