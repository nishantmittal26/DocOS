const FALLBACK_PREFIX = 'DOC';
const DEFAULT_LENGTH = 4;
export const PATIENT_ID_PREFIX_MAX_LENGTH = 20;

/** First four letters (A–Z) from clinic name; pad with X if shorter; DOC if none. */
export function derivePatientIdPrefixFromClinicName(clinicName: string): string {
  const letters = clinicName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (letters.length >= DEFAULT_LENGTH) {
    return letters.slice(0, DEFAULT_LENGTH);
  }
  if (letters.length > 0) {
    return letters.padEnd(DEFAULT_LENGTH, 'X');
  }
  return FALLBACK_PREFIX;
}

export function sanitizePatientIdPrefixInput(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, PATIENT_ID_PREFIX_MAX_LENGTH);
}
