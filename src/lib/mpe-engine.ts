// OIML R-76 & Legal Metrology (General) Rules, 2011 — Maximum Permissible Error (MPE) Engine
import type { AccuracyClass, VerificationType } from '@/types/metrology';

export interface MPEEvaluation {
  testLoad: number;
  observedReading: number;
  error: number; // observedReading - testLoad
  mpe: number;   // Maximum Permissible Error (absolute value)
  minAcceptable: number;
  maxAcceptable: number;
  isCompliant: boolean;
  mpeFormula: string;
}

/**
 * Calculates Maximum Permissible Error (MPE) in scale intervals 'e' according to OIML R-76 Table 6
 * and Seventh Schedule of Legal Metrology (General) Rules, 2011.
 *
 * @param loadInE - Load expressed as number of verification scale intervals (m / e)
 * @param accuracyClass - Instrument accuracy class (CLASS_I, CLASS_II, CLASS_III, CLASS_IIII)
 * @param verificationType - INITIAL, PERIODIC_REVERIFICATION, or POST_REPAIR
 * @returns MPE in multiples of 'e'
 */
export function getMPEInScaleIntervals(
  loadInE: number,
  accuracyClass: AccuracyClass,
  verificationType: VerificationType = 'INITIAL'
): number {
  const absLoad = Math.abs(loadInE);
  let baseMPE = 0.5; // in 'e'

  switch (accuracyClass) {
    case 'CLASS_I': // Special Accuracy
      if (absLoad <= 50000) {
        baseMPE = 0.5;
      } else if (absLoad <= 200000) {
        baseMPE = 1.0;
      } else {
        baseMPE = 1.5;
      }
      break;

    case 'CLASS_II': // High Accuracy
      if (absLoad <= 5000) {
        baseMPE = 0.5;
      } else if (absLoad <= 20000) {
        baseMPE = 1.0;
      } else {
        baseMPE = 1.5;
      }
      break;

    case 'CLASS_III': // Medium Accuracy (Commercial retail & platform scales)
    default:
      if (absLoad <= 500) {
        baseMPE = 0.5;
      } else if (absLoad <= 2000) {
        baseMPE = 1.0;
      } else {
        baseMPE = 1.5;
      }
      break;

    case 'CLASS_IIII': // Ordinary Accuracy
      if (absLoad <= 50) {
        baseMPE = 0.5;
      } else if (absLoad <= 200) {
        baseMPE = 1.0;
      } else {
        baseMPE = 1.5;
      }
      break;
  }

  // Under in-service inspection, MPE is often 2x of initial verification under Section 24 periodic reverifications
  const multiplier = verificationType === 'PERIODIC_REVERIFICATION' ? 1.0 : 1.0; 
  return baseMPE * multiplier;
}

/**
 * Evaluates an observed reading against statutory MPE for a given test load.
 */
export function evaluateLoadReading(
  testLoad: number,
  observedReading: number,
  verificationInterval_e: number,
  accuracyClass: AccuracyClass,
  verificationType: VerificationType = 'INITIAL'
): MPEEvaluation {
  const error = Number((observedReading - testLoad).toFixed(4));
  const loadInE = testLoad / verificationInterval_e;
  const mpeInE = getMPEInScaleIntervals(loadInE, accuracyClass, verificationType);
  const mpeValue = Number((mpeInE * verificationInterval_e).toFixed(4));

  const isCompliant = Math.abs(error) <= mpeValue;

  return {
    testLoad,
    observedReading,
    error,
    mpe: mpeValue,
    minAcceptable: Number((testLoad - mpeValue).toFixed(4)),
    maxAcceptable: Number((testLoad + mpeValue).toFixed(4)),
    isCompliant,
    mpeFormula: `±${mpeInE}e (±${mpeValue})`,
  };
}

/**
 * Statutory Stamping Fee calculation under Legal Metrology Rules for weighing instruments
 */
export function calculateStampingFee(maxCapacity: number, unit: 'g' | 'kg' | 't' | 'mg'): number {
  // Convert capacity to kg for standard slab evaluation
  let capacityInKg = maxCapacity;
  if (unit === 'g') capacityInKg = maxCapacity / 1000;
  else if (unit === 'mg') capacityInKg = maxCapacity / 1000000;
  else if (unit === 't') capacityInKg = maxCapacity * 1000;

  if (capacityInKg <= 5) return 100; // Retail electronic counter scale
  if (capacityInKg <= 50) return 200; // Medium counter / platform
  if (capacityInKg <= 200) return 400; // Large platform scale
  if (capacityInKg <= 1000) return 1000; // Industrial scale
  if (capacityInKg <= 10000) return 3000; // High capacity scale
  return 5000; // Weighbridges (> 10 tonnes)
}
