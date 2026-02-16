export interface DocumentMetadata {
  documentType?: string;
  patientId?: string; // ID opaco, no datos médicos
  issuedAt?: string;
  [key: string]: unknown;
}
