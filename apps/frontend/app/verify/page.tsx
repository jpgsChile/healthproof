'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import Link from 'next/link';
import { blockchainService } from '@/services/blockchain';

function VerifyContent() {
  const searchParams = useSearchParams();
  const hash = searchParams.get('hash');

  const { data, isLoading, error } = useQuery({
    queryKey: ['verify', hash],
    queryFn: () => blockchainService.verifyDocument(hash!),
    enabled: !!hash,
  });

  if (!hash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="rounded-xl border bg-card p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Verificación de documento</h1>
          <p className="text-muted-foreground text-sm">
            Añade el hash del documento en la URL: /verify?hash=0x...
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando en blockchain...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Error de verificación
          </h1>
          <p className="text-sm text-red-700 dark:text-red-300">
            {error instanceof Error ? error.message : 'No se pudo verificar'}
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const verified = data?.exists ?? false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div
        className={`rounded-xl border p-8 max-w-md w-full text-center ${
          verified
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
        }`}
      >
        <div
          className={`text-4xl mb-4 ${verified ? 'text-emerald-600' : 'text-amber-600'}`}
        >
          {verified ? '✓' : '✕'}
        </div>
        <h1 className="text-xl font-semibold mb-2">
          {verified ? 'Documento verificado' : 'Documento no válido'}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {verified
            ? 'Este documento está registrado en Avalanche y es válido.'
            : 'Documento no encontrado o revocado.'}
        </p>
        {verified && data && (
          <div className="text-left text-sm space-y-1 bg-white/50 dark:bg-black/20 rounded-lg p-4">
            <p>
              <span className="text-muted-foreground">Emisor:</span>{' '}
              <code className="font-mono">{data.issuer}</code>
            </p>
            <p>
              <span className="text-muted-foreground">Registrado:</span>{' '}
              {new Date(Number(data.timestamp) * 1000).toLocaleString('es-ES')}
            </p>
          </div>
        )}
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-medium text-primary hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
