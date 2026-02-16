'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DocumentUploadProps {
  issuerId: string;
}

export function DocumentUpload({ issuerId }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState('{}');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona un archivo');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('issuerId', issuerId);
      formData.append('metadata', metadata);
      const res = await api.uploadDocument(formData);
      return res;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-2">Documento</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Metadata (JSON)</label>
        <textarea
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md bg-background"
          placeholder='{"documentType": "vaccination"}'
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !file}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {mutation.isPending ? 'Registrando...' : 'Registrar en blockchain'}
      </button>
      {mutation.isSuccess && (
        <div className="p-4 rounded-md bg-green-50 text-green-800 text-sm">
          <p>Documento registrado</p>
          <p className="font-mono text-xs mt-1">Tx: {mutation.data.txHash}</p>
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
