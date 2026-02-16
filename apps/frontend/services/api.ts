const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface DocumentRecord {
  id: string;
  documentHash: string;
  metadataHash: string;
  txHash: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface UploadDocumentResponse {
  id: string;
  documentHash: string;
  metadataHash: string;
  txHash: string;
  issuerId: string;
}

export interface IssuerRecord {
  id: string;
  name: string;
  walletAddress: string;
  isActive: boolean;
}

export const api = {
  async uploadDocument(formData: FormData): Promise<UploadDocumentResponse> {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Error al subir documento');
    }
    return res.json();
  },

  async getDocumentsByWallet(walletAddress: string): Promise<DocumentRecord[]> {
    const res = await fetch(
      `${API_BASE}/documents?wallet=${encodeURIComponent(walletAddress)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.documents ?? [];
  },

  async getIssuerByWallet(walletAddress: string): Promise<IssuerRecord | null> {
    const res = await fetch(
      `${API_BASE}/issuers/by-wallet/${encodeURIComponent(walletAddress)}`,
    );
    if (!res.ok) return null;
    return res.json();
  },
};
