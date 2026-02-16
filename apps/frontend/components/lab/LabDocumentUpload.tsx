'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

interface LabDocumentUploadProps {
  issuerId: string;
  onSuccess?: () => void;
}

export function LabDocumentUpload({ issuerId, onSuccess }: LabDocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState('{"documentType": "lab_result"}');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona un archivo');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('issuerId', issuerId);
      formData.append('metadata', metadata);
      return api.uploadDocument(formData);
    },
    onSuccess: () => {
      setFile(null);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">Archivo</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-medium"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Metadata (JSON)</label>
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder='{"documentType": "lab_result"}'
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !file}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? 'Registrando en blockchain...' : 'Registrar documento'}
      </button>
      {mutation.isSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-sm">
          <p className="font-medium">Documento registrado correctamente</p>
          <p className="font-mono text-xs mt-1 truncate">Tx: {mutation.data?.txHash}</p>
        </div>
      )}
      {mutation.isError && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-sm">
          {mutation.error instanceof Error ? mutation.error.message : 'Error al registrar'}
        </div>
      )}
    </form>
  );
}
