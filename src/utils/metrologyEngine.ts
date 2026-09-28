/**
 * Live Metrology Engine under Section 24 of Legal Metrology Act, 2009 & OIML R-76.
 * Performs deterministic Maximum Permissible Error (MPE) calculations.
 * ZERO random states, ZERO mock calculations.
 */

export interface MPEResult {
  difference: number;
  toleranceLimit: number;
  status: 'PASS' | 'FAIL';
  isCompliant: boolean;
  message: string;
}

/**
 * Calculates Maximum Permissible Error (MPE) strictly based on statutory law:
 * Difference = Math.abs(appliedLoad - observedLoad)
 * If Difference > verification_interval_e, return "FAIL", otherwise "PASS".
 *
 * @param appliedLoad - Target statutory calibration mass applied to the load receptor (in kg/g/t)
 * @param observedLoad - Reading displayed on the instrument indicator
 * @param verification_interval_e - Statutory verification scale interval 'e'
 */
export function calculateMPE(
  appliedLoad: number,
  observedLoad: number,
  verification_interval_e: number
): MPEResult {
  // Guard against invalid or NaN inputs
  const applied = Number(appliedLoad) || 0;
  const observed = Number(observedLoad) || 0;
  const e = Number(verification_interval_e) || 0.001;

  // Strict legal formula: Difference = Math.abs(appliedLoad - observedLoad)
  const rawDiff = Math.abs(applied - observed);
  // Round to 6 decimal places to prevent floating-point IEEE-754 precision artifacts (e.g. 0.005000000000000004)
  const difference = Number(rawDiff.toFixed(6));
  const toleranceLimit = Number(Number(e).toFixed(6));

  const isFailed = difference > toleranceLimit;
  const status: 'PASS' | 'FAIL' = isFailed ? 'FAIL' : 'PASS';

  return {
    difference,
    toleranceLimit,
    status,
    isCompliant: !isFailed,
    message: isFailed
      ? `Observed error (${difference}) exceeds verification interval e (±${toleranceLimit})`
      : `Within permissible statutory tolerance (≤ ±${toleranceLimit})`,
  };
}

/**
 * Convenience curried function for direct inline UI binding:
 * onChange={(e) => { const result = evaluateEccentricityMPE(10, e.target.value, 0.005); }}
 */
export function evaluateEccentricityMPE(
  appliedLoad: number,
  observedLoad: number | string,
  verification_interval_e: number
): 'PASS' | 'FAIL' {
  const numObserved = typeof observedLoad === 'string' ? parseFloat(observedLoad) : observedLoad;
  if (isNaN(numObserved)) return 'FAIL';
  return calculateMPE(appliedLoad, numObserved, verification_interval_e).status;
}
