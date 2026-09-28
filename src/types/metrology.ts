// Domain types for SatyaMaap 360 under Section 24 of Legal Metrology Act, 2009

export type AccuracyClass = 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IIII';

export type InstrumentType = 
  | 'ELECTRONIC_COUNTER_SCALE' 
  | 'PLATFORM_SCALE' 
  | 'WEIGHBRIDGE' 
  | 'PRECISION_BALANCE' 
  | 'SPRING_BALANCE' 
  | 'AUTOMATIC_GRAVIMETRIC';

export type VerificationType = 'INITIAL' | 'PERIODIC_REVERIFICATION' | 'POST_REPAIR';

export type VerificationStatus = 'VERIFIED' | 'REJECTED' | 'PENDING_INSPECTION' | 'EXPIRED' | 'SEIZED';

export interface InstrumentSpecs {
  id: string;
  applicationNo: string;
  traderName: string;
  businessName: string;
  tradeLicenseNo: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  instrumentType: InstrumentType;
  make: string;
  model: string;
  serialNumber: string;
  modelApprovalNo: string; // Government Model Approval Number
  accuracyClass: AccuracyClass;
  maxCapacity: number; // in unit
  minCapacity: number; // in unit
  verificationInterval_e: number; // e (Verification scale interval) in unit
  scaleInterval_d: number; // d (Actual scale interval) in unit
  unit: 'g' | 'kg' | 't' | 'mg';
  verificationFee: number;
}

export interface EccentricityTestReading {
  positionName: string; // Center, Front-Left, Front-Right, Rear-Left, Rear-Right
  testLoad: number;
  indicatedValue: number;
  error: number;
  mpe: number;
  isCompliant: boolean;
  mpeStatus?: 'PASS' | 'FAIL';
}

export interface RepeatabilityTestReading {
  runNumber: number;
  testLoad: number;
  indicatedValue: number;
  error: number;
  mpe: number;
  isCompliant: boolean;
}

export interface LinearityTestReading {
  loadStep: string; // Min, 500e, 2000e, 50% Max, Max
  appliedLoad: number;
  increasingIndicated: number;
  decreasingIndicated: number;
  increasingError: number;
  decreasingError: number;
  mpe: number;
  isCompliant: boolean;
}

export interface InspectionSession {
  instrument: InstrumentSpecs;
  officerName: string;
  officerBadge: string;
  jurisdictionZone: string;
  verificationType: VerificationType;
  inspectionDate: string;
  nextDueDate: string;
  physicalConditionOk: boolean;
  modelPlatePresent: boolean;
  sealingProvisionIntact: boolean;
  eccentricityTests: EccentricityTestReading[];
  repeatabilityTests: RepeatabilityTestReading[];
  linearityTests: LinearityTestReading[];
  overallStatus: VerificationStatus;
  leadSealNumber?: string;
  hologramNumber?: string;
  rejectionReason?: string;
  certificateNumber?: string;
  stampingFeePaid: number;
  sealImageUrl?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestampUtc?: string;
}
