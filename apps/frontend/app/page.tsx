import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-6">HealthProof</h1>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        Verificación segura de documentos médicos en Avalanche
      </p>
      <nav className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/dashboard/lab"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Laboratorio
        </Link>
        <Link
          href="/dashboard/issuer"
          className="px-4 py-2 rounded-lg border border-input hover:bg-accent"
        >
          Emisor
        </Link>
        <Link
          href="/dashboard/patient"
          className="px-4 py-2 rounded-lg border border-input hover:bg-accent"
        >
          Paciente
        </Link>
        <Link
          href="/dashboard/verifier"
          className="px-4 py-2 rounded-lg border border-input hover:bg-accent"
        >
          Verificador
        </Link>
      </nav>
    </main>
  );
}
