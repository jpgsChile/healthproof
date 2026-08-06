/**
 * PreventProtocolEngine — selecciona automáticamente qué protocolo de
 * Evaluación Preventiva Inteligente (EPI) aplica a un paciente. Nadie más
 * en el sistema elige un protocolo a mano: el paciente nunca ve esta
 * lógica, solo experimenta "una evaluación personalizada".
 *
 * Open/Closed: agregar un protocolo nuevo requiere únicamente
 *   1. crear su carpeta en `protocols/<nombre>/`,
 *   2. implementar la interfaz `PreventProtocol`,
 *   3. agregarlo al arreglo `PROTOCOLS` de abajo (orden: más específico
 *      primero, porque el motor usa el primero que calce).
 * No hace falta tocar ningún otro archivo de este motor ni de los
 * protocolos existentes.
 *
 * Protocolos planeados a futuro (arquitectura preparada, NO implementados
 * todavía — ver PreventProtocol.ts para el contrato que deberán cumplir):
 *   - Control Niño Sano
 *   - Adolescente
 *   - Embarazo
 *   - Cardiovascular
 *   - Diabetes
 *   - Salud Mental
 *   - Oncología Preventiva
 *   - Enfermedades Respiratorias
 *   - Mujer
 *   - Hombre
 */

import type {
  PreventProtocol,
  ProtocolProfile,
} from "../protocols/base/PreventProtocol";
import { empaProtocol } from "../protocols/empa/EMPAProtocol";
import { empamProtocol } from "../protocols/empam/EMPAMProtocol";

const PROTOCOLS: PreventProtocol[] = [empamProtocol, empaProtocol];

/** Protocolo de respaldo si ningún `matches()` calza (ej. edad fuera de rango conocido) — nunca dejar al paciente sin evaluación. */
const DEFAULT_PROTOCOL: PreventProtocol = empaProtocol;

/**
 * Edad asumida cuando el paciente no autoriza compartirla (consentimiento
 * explícito rechazado) — nunca bloqueamos la evaluación por eso. Exportada
 * para que tanto el server action de la demo como la UI cliente (que
 * decide si mostrar el paso de Evaluación Funcional) usen el mismo valor,
 * sin duplicarlo.
 */
export const DEFAULT_ADULT_AGE = 40;

export function selectProtocol(profile: ProtocolProfile): PreventProtocol {
  return (
    PROTOCOLS.find((protocol) => protocol.matches(profile)) ?? DEFAULT_PROTOCOL
  );
}

export function getRegisteredProtocols(): readonly PreventProtocol[] {
  return PROTOCOLS;
}

export { empaProtocol, empamProtocol };
