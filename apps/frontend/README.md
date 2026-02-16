# HealthProof Frontend

Next.js 14 + TypeScript + Tailwind + React Query

## Stack

- **Next.js 14** - App Router
- **TypeScript**
- **Tailwind CSS**
- **React Query** - Data fetching
- **Privy / Web3Auth** - Auth (opcional, ver `components/layout/Providers.tsx`)

## Estructura

```
app/
├── dashboard/
│   ├── issuer/    # Panel emisor - subir documentos
│   ├── patient/   # Mis documentos
│   └── verifier/  # Verificar documentos
components/
├── document/      # DocumentUpload, DocumentList, DocumentVerify
├── ui/            # cn, etc.
└── layout/        # Providers, DashboardNav
services/
├── api.ts         # Backend API
└── blockchain.ts # ethers.js + Avalanche
```

## Setup

```bash
npm install
cp .env.example .env
# Configurar NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DOCUMENT_REGISTRY_ADDRESS
npm run dev
```

## Auth (Privy)

Para integrar Privy:

```bash
npm install @privy-io/react-auth
```

Configurar `NEXT_PUBLIC_PRIVY_APP_ID` y actualizar `components/layout/Providers.tsx` con `PrivyProvider` y `usePrivy()`.
