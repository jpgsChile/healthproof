'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './Providers';
import { cn } from '@/components/ui/cn';

const navItems = [
  { href: '/dashboard/lab', label: 'Laboratorio' },
  { href: '/dashboard/issuer', label: 'Emisor' },
  { href: '/dashboard/patient', label: 'Paciente' },
  { href: '/dashboard/verifier', label: 'Verificador' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, login, logout } = useAuth();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold">
          HealthProof
        </Link>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
              <button
                onClick={logout}
                className="text-sm px-3 py-1 rounded-md border hover:bg-muted"
              >
                Salir
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Conectar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
