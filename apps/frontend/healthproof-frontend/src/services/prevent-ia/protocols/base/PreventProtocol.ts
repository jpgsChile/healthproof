/**
 * Contrato común de un protocolo de Evaluación Preventiva Inteligente (EPI).
 *
 * Cada protocolo (EMPA, EMPAM, y a futuro Control Niño Sano, Adolescente,
 * Embarazo, Cardiovascular, Diabetes, Salud Mental, Oncología Preventiva,
 * Enfermedades Respiratorias, Mujer, Hombre) implementa esta interfaz.
 * `PreventProtocolEngine` decide cuál instanciar — el resto del sistema
 * (agente, acciones, UI) nunca elige un protocolo a mano.
 *
 * No reemplaza `health-score-engine.ts` ni `agent.ts`: los protocolos
 * COMPONEN esa lógica ya existente (ver `shared-modules.ts`) en vez de
 * reimplementarla.
 */
import type {
  ClinicalResult,
  PatientHistoryEntry,
  RiskLevel,
} from "../../types";

export type ProtocolKey = "empa" | "empam";

/** Datos mínimos necesarios para que el motor decida qué protocolo aplica. Se amplía a futuro (sexo, antecedentes) sin romper protocolos existentes — todos los campos nuevos deben ser opcionales. */
export interface ProtocolProfile {
  age: number;
  sex?: "F" | "M";
}

/** Respuestas conversacionales comunes a todos los protocolos. */
export interface ConversationalAnswers {
  smoking: boolean | null;
  familyHistory: boolean | null;
}

/** Evaluación funcional — hoy solo la usa EMPAM (65+), pero vive en `base/` porque a futuro otros protocolos de adulto mayor podrían reutilizarla. */
export interface FunctionalAssessmentAnswers {
  walkingDifficulty: boolean | null;
  recentFalls: boolean | null;
  usesCane: boolean | null;
  memoryConcerns: boolean | null;
  basicActivitiesDifficulty: boolean | null;
  unintentionalWeightLoss: boolean | null;
  polypharmacy: boolean | null;
  socialIsolation: boolean | null;
  functionalDependence: boolean | null;
}

export type HealthScoreModuleKey =
  | "laboratorio"
  | "factoresRiesgo"
  | "habitos"
  | "conversacional"
  | "evaluacionFuncional";

/** Un módulo del Health Score, con cuánto aportó (siempre <= 0, son penalizaciones) y por qué — nunca una caja negra. */
export interface HealthScoreModule {
  key: HealthScoreModuleKey;
  points: number;
  explanation: string;
}

export interface ProtocolHealthScoreResult {
  healthScore: number;
  riskLevel: RiskLevel;
  modules: HealthScoreModule[];
}

/** Pregunta requerida por el protocolo — el chat la traduce vía `translationKey`, nunca hardcodea texto por protocolo. */
export interface ProtocolQuestion {
  id: string;
  translationKey: string;
}

export interface PreventProtocolInput {
  current: ClinicalResult;
  history: PatientHistoryEntry[];
  profile: ProtocolProfile;
  conversational: ConversationalAnswers;
  /** Solo la completan los protocolos que la requieren (hoy: EMPAM). */
  functional?: FunctionalAssessmentAnswers;
}

export interface PreventProtocolAnalysis {
  protocol: ProtocolKey;
  healthScore: ProtocolHealthScoreResult;
  scoreExplanation: string;
}

export interface PreventProtocol {
  readonly key: ProtocolKey;
  /** Clave i18n con el nombre visible del protocolo — ver `protocol.empa`/`protocol.empam` en messages/*.json. */
  readonly translationKey: string;

  /** ¿Este protocolo corresponde al perfil del paciente? El motor prueba los protocolos en orden y usa el primero que calce. */
  matches(profile: ProtocolProfile): boolean;

  /** Preguntas conversacionales que este protocolo necesita responder antes de poder evaluar. */
  requiredQuestions(): ProtocolQuestion[];

  /** Health Score modular — cada módulo explica cuánto aportó. */
  healthScore(input: PreventProtocolInput): ProtocolHealthScoreResult;

  calculateRisk(healthScore: number): RiskLevel;

  analyze(input: PreventProtocolInput): PreventProtocolAnalysis;

  /** Acciones preventivas concretas y acotadas (no reemplaza la redacción del agente en `agent.ts`, la complementa). */
  recommendations(analysis: PreventProtocolAnalysis): string[];
}
