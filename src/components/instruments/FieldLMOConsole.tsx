import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Crosshair,
} from 'lucide-react';
import type {
  InstrumentSpecs,
  InspectionSession,
  EccentricityTestReading,
  RepeatabilityTestReading,
  LinearityTestReading,
  VerificationStatus,
} from '@/types/metrology';
import { evaluateLoadReading } from '@/lib/mpe-engine';
import { calculateMPE as calculateStatutoryMPE } from '@/utils/metrologyEngine';
import { CertificateViewerModal } from './CertificateViewerModal';
import { PhysicalSealingCapture } from './PhysicalSealingCapture';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';

const DEFAULT_INSPECTION_INSTRUMENT: InstrumentSpecs = {
  id: 'inst-sec24-live',
  applicationNo: 'SM360-2026-DEL-0891',
  traderName: 'Rajesh Kumar Gupta',
  businessName: 'Gupta Kirana & General Merchant',
  tradeLicenseNo: 'DL-MCD-2024-99812',
  address: 'Shop No. 14, Main Market, Lajpat Nagar II',
  district: 'South East Delhi',
  state: 'Delhi',
  pincode: '110024',
  instrumentType: 'ELECTRONIC_COUNTER_SCALE',
  make: 'Essae-Teraoka',
  model: 'DS-215N',
  serialNumber: 'ES-2026-884129',
  modelApprovalNo: 'IND/09/2021/412',
  accuracyClass: 'CLASS_III',
  maxCapacity: 30,
  minCapacity: 0.1,
  verificationInterval_e: 0.005,
  scaleInterval_d: 0.005,
  unit: 'kg',
  verificationFee: 200,
};

/**
 * Calculates Maximum Permissible Error (MPE) strictly based on statutory law:
 * Difference = Math.abs(appliedLoad - observedLoad)
 * If Difference > verification_interval_e, return "FAIL", otherwise "PASS".
 */
export function calculateMPE(
  accuracyClassOrApplied: any,
  appliedLoadOrObserved: any,
  observedLoadOrE: any,
  optionalE?: number
): any {
  if (optionalE !== undefined) {
    const appliedLoad = Number(appliedLoadOrObserved);
    const observedLoad = Number(observedLoadOrE);
    const e = Number(optionalE);
    return calculateStatutoryMPE(appliedLoad, observedLoad, e).status;
  } else {
    const appliedLoad = Number(accuracyClassOrApplied);
    const observedLoad = Number(appliedLoadOrObserved);
    const e = Number(observedLoadOrE);
    return calculateStatutoryMPE(appliedLoad, observedLoad, e).status;
  }
}

interface FieldLMOConsoleProps {
  selectedInstrument?: InstrumentSpecs | null;
  onInspectionCompleted: (session: InspectionSession) => void;
}

export function FieldLMOConsole({ selectedInstrument, onInspectionCompleted }: FieldLMOConsoleProps) {
  // Currently active instrument being inspected
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentSpecs>(
    selectedInstrument || DEFAULT_INSPECTION_INSTRUMENT
  );

  const [liveInstruments, setLiveInstruments] = useState<InstrumentSpecs[]>([
    selectedInstrument || DEFAULT_INSPECTION_INSTRUMENT,
  ]);

  // Fetch live instruments from Supabase
  useEffect(() => {
    async function fetchLiveQueue() {
      try {
        const { data } = await supabase.from('instruments').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const mapped: InstrumentSpecs[] = data.map((r) => ({
            id: r.id,
            applicationNo: `SM360-${r.serial_number}`,
            traderName: r.trader_name,
            businessName: r.business_name || `${r.trader_name} Commercial Firm`,
            tradeLicenseNo: r.trade_license_no || 'TL-2026-REG',
            address: r.address || 'Market Premises',
            district: r.district || 'Delhi Central',
            state: r.state || 'Delhi',
            pincode: r.pincode || '110001',
            instrumentType: (r.instrument_type as any) || 'ELECTRONIC_COUNTER_SCALE',
            make: r.make || 'Standard',
            model: r.model || 'Scale-360',
            serialNumber: r.serial_number,
            modelApprovalNo: r.model_approval_no || 'IND/01/2024/099',
            accuracyClass: (r.accuracy_class as any) || 'CLASS_III',
            maxCapacity: Number(r.max_capacity) || 30,
            minCapacity: Number(r.min_capacity) || 0.1,
            verificationInterval_e: Number(r.verification_interval_e) || 0.005,
            scaleInterval_d: Number(r.scale_interval_d) || 0.005,
            unit: (r.unit as any) || 'kg',
            verificationFee: Number(r.stamping_fee) || 200,
          }));
          setLiveInstruments(mapped);
          if (!selectedInstrument) {
            handleSelectInstrument(mapped[0]);
          }
        }
      } catch (err) {
        console.warn('Live instruments fetch deferred:', err);
      }
    }
    fetchLiveQueue();
  }, [selectedInstrument]);

  // Physical checklist
  const [physicalChecks, setPhysicalChecks] = useState({
    modelPlatePresent: true,
    spiritLevelCentered: true,
    sealingProvisionIntact: true,
    zeroTrackingFunctional: true,
  });

  // Test 1: Eccentricity Readings (1/3 of Max)
  const defaultEccentricLoad = Number((currentInstrument.maxCapacity / 3).toFixed(3));
  const [eccentricLoad, setEccentricLoad] = useState<number>(defaultEccentricLoad);
  const [eccentricReadings, setEccentricReadings] = useState<Record<string, number>>({
    'Center': defaultEccentricLoad,
    'Front-Left': defaultEccentricLoad,
    'Front-Right': defaultEccentricLoad,
    'Rear-Left': defaultEccentricLoad,
    'Rear-Right': defaultEccentricLoad,
  });

  // Test 2: Repeatability Readings (50% of Max)
  const defaultRepLoad = Number((currentInstrument.maxCapacity * 0.5).toFixed(3));
  const [repLoad, setRepLoad] = useState<number>(defaultRepLoad);
  const [repReadings, setRepReadings] = useState<number[]>([
    defaultRepLoad,
    defaultRepLoad,
    defaultRepLoad,
  ]);

  // Test 3: Linearity / Error of Indication Readings
  const defaultMin = currentInstrument.minCapacity;
  const default500e = Number((500 * currentInstrument.verificationInterval_e).toFixed(3));
  const default2000e = Number((2000 * currentInstrument.verificationInterval_e).toFixed(3));
  const defaultMax = currentInstrument.maxCapacity;

  const [linearReadings, setLinearReadings] = useState([
    { step: `Min (${defaultMin} ${currentInstrument.unit})`, load: defaultMin, inc: defaultMin, dec: defaultMin },
    { step: `500e (${default500e} ${currentInstrument.unit})`, load: default500e, inc: default500e, dec: default500e },
    { step: `2000e (${default2000e} ${currentInstrument.unit})`, load: default2000e, inc: default2000e, dec: default2000e },
    { step: `Max (${defaultMax} ${currentInstrument.unit})`, load: defaultMax, inc: defaultMax, dec: defaultMax },
  ]);

  // Stamping seal inputs
  const [leadSealNo, setLeadSealNo] = useState(`IND-DL-${new Date().getFullYear().toString().slice(-2)}-LS-${Math.floor(10000 + Math.random() * 90000)}`);
  const [hologramNo, setHologramNo] = useState(`HG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);

  // Certificate Modal State
  const [certSession, setCertSession] = useState<InspectionSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync when instrument changes
  const handleSelectInstrument = (inst: InstrumentSpecs) => {
    setCurrentInstrument(inst);
    const newEccLoad = Number((inst.maxCapacity / 3).toFixed(3));
    setEccentricLoad(newEccLoad);
    setEccentricReadings({
      'Center': newEccLoad,
      'Front-Left': newEccLoad,
      'Front-Right': newEccLoad,
      'Rear-Left': newEccLoad,
      'Rear-Right': newEccLoad,
    });
    const newRepLoad = Number((inst.maxCapacity * 0.5).toFixed(3));
    setRepLoad(newRepLoad);
    setRepReadings([newRepLoad, newRepLoad, newRepLoad]);
    const min = inst.minCapacity;
    const e500 = Number((500 * inst.verificationInterval_e).toFixed(3));
    const e2000 = Number((2000 * inst.verificationInterval_e).toFixed(3));
    const max = inst.maxCapacity;
    setLinearReadings([
      { step: `Min (${min} ${inst.unit})`, load: min, inc: min, dec: min },
      { step: `500e (${e500} ${inst.unit})`, load: e500, inc: e500, dec: e500 },
      { step: `2000e (${e2000} ${inst.unit})`, load: e2000, inc: e2000, dec: e2000 },
      { step: `Max (${max} ${inst.unit})`, load: max, inc: max, dec: max },
    ]);
  };

  // Evaluate Eccentricity using calculateMPE
  const evaluatedEccentricity: EccentricityTestReading[] = Object.entries(eccentricReadings).map(
    ([pos, reading]) => {
      const mpeStatus: 'PASS' | 'FAIL' = calculateMPE(
        currentInstrument.accuracyClass,
        eccentricLoad,
        reading,
        currentInstrument.verificationInterval_e
      );
      const isCompliant = mpeStatus === 'PASS';
      const error = Number((reading - eccentricLoad).toFixed(4));
      const mpe = Number((1.0 * currentInstrument.verificationInterval_e).toFixed(4));

      return {
        positionName: pos,
        testLoad: eccentricLoad,
        indicatedValue: reading,
        error,
        mpe,
        isCompliant,
        mpeStatus,
      };
    }
  );
  const isEccentricityPassed = evaluatedEccentricity.every((r) => r.mpeStatus === 'PASS');

  // Evaluate Repeatability
  const evaluatedRepeatability: RepeatabilityTestReading[] = repReadings.map((reading, idx) => {
    const evaluation = evaluateLoadReading(
      repLoad,
      reading,
      currentInstrument.verificationInterval_e,
      currentInstrument.accuracyClass
    );
    return {
      runNumber: idx + 1,
      testLoad: repLoad,
      indicatedValue: reading,
      error: evaluation.error,
      mpe: evaluation.mpe,
      isCompliant: evaluation.isCompliant,
    };
  });
  const isRepeatabilityPassed = evaluatedRepeatability.every((r) => r.isCompliant);

  // Evaluate Linearity
  const evaluatedLinearity: LinearityTestReading[] = linearReadings.map((item) => {
    const evalInc = evaluateLoadReading(
      item.load,
      item.inc,
      currentInstrument.verificationInterval_e,
      currentInstrument.accuracyClass
    );
    const evalDec = evaluateLoadReading(
      item.load,
      item.dec,
      currentInstrument.verificationInterval_e,
      currentInstrument.accuracyClass
    );
    return {
      loadStep: item.step,
      appliedLoad: item.load,
      increasingIndicated: item.inc,
      decreasingIndicated: item.dec,
      increasingError: evalInc.error,
      decreasingError: evalDec.error,
      mpe: evalInc.mpe,
      isCompliant: evalInc.isCompliant && evalDec.isCompliant,
    };
  });
  const isLinearityPassed = evaluatedLinearity.every((r) => r.isCompliant);

  const areAllPhysicalPassed = Object.values(physicalChecks).every(Boolean);
  const areAllTestsPassed = areAllPhysicalPassed && isEccentricityPassed && isRepeatabilityPassed && isLinearityPassed;

  // Simulate Load Tolerance Defect (for officer testing)
  const injectIntentionalError = () => {
    const badLoad = eccentricLoad + currentInstrument.verificationInterval_e * 4; // Exceeds MPE
    setEccentricReadings((prev) => ({
      ...prev,
      'Front-Right': Number(badLoad.toFixed(3)),
    }));
    toast.error('Injected intentional off-center tolerance defect (> MPE)');
  };

  const resetAllToCompliant = () => {
    handleSelectInstrument(currentInstrument);
    toast.success('Reset all readings to factory calibration tolerances');
  };

  // Complete inspection with geocoded watermarked evidence from Tab 4
  const handleFinalizeWithEvidence = async (evidence: {
    sealImageUrl: string;
    gpsCoordinates: { latitude: number; longitude: number; accuracy: number };
    timestampUtc: string;
  }) => {
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const session: InspectionSession = {
      instrument: currentInstrument,
      officerName: 'Devansh Jaiswal',
      officerBadge: 'LMO-DL-CENTRAL-042',
      jurisdictionZone: 'Delhi Zone-1 (South East)',
      verificationType: 'PERIODIC_REVERIFICATION',
      inspectionDate: today,
      nextDueDate: nextYear,
      physicalConditionOk: physicalChecks.modelPlatePresent && physicalChecks.spiritLevelCentered,
      modelPlatePresent: physicalChecks.modelPlatePresent,
      sealingProvisionIntact: physicalChecks.sealingProvisionIntact,
      eccentricityTests: evaluatedEccentricity,
      repeatabilityTests: evaluatedRepeatability,
      linearityTests: evaluatedLinearity,
      overallStatus: areAllTestsPassed ? 'VERIFIED' : 'REJECTED',
      leadSealNumber: areAllTestsPassed ? leadSealNo : undefined,
      hologramNumber: areAllTestsPassed ? hologramNo : undefined,
      rejectionReason: areAllTestsPassed ? undefined : 'Maximum Permissible Error (MPE) exceeded during calibration tests under Section 24.',
      certificateNumber: areAllTestsPassed
        ? `LM/DL/SEC24/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`
        : undefined,
      stampingFeePaid: currentInstrument.verificationFee,
      sealImageUrl: evidence.sealImageUrl,
      gpsCoordinates: evidence.gpsCoordinates,
      timestampUtc: evidence.timestampUtc,
    };

    onInspectionCompleted(session);
    setCertSession(session);
    setIsModalOpen(true);

    // Persist instrument and eccentricity inspection test readings with GPS & seal evidence to Supabase
    try {
      const { data: instData } = await supabase
        .from('instruments')
        .upsert({
          serial_number: currentInstrument.serialNumber,
          trader_name: currentInstrument.traderName,
          accuracy_class: currentInstrument.accuracyClass,
          max_capacity: currentInstrument.maxCapacity,
          verification_interval_e: currentInstrument.verificationInterval_e,
          stamping_fee: currentInstrument.verificationFee,
        }, { onConflict: 'serial_number' })
        .select('id')
        .maybeSingle();

      if (instData?.id) {
        const inspectionInserts = evaluatedEccentricity.map((test) => ({
          instrument_id: instData.id,
          inspector_id: session.officerBadge,
          zone: session.jurisdictionZone,
          test_type: `ECCENTRICITY_${test.positionName.toUpperCase().replace(/\s+/g, '_')}`,
          applied_load: test.testLoad,
          observed_load: test.indicatedValue,
          difference: Math.abs(test.testLoad - test.indicatedValue),
          mpe_limit: currentInstrument.verificationInterval_e,
          mpe_status: test.mpeStatus || (test.isCompliant ? 'PASS' : 'FAIL'),
          lead_seal_number: leadSealNo,
          hologram_number: hologramNo,
          seal_image_url: evidence.sealImageUrl,
          photo_url: evidence.sealImageUrl,
          gps_latitude: evidence.gpsCoordinates.latitude,
          gps_longitude: evidence.gpsCoordinates.longitude,
        }));

        await supabase.from('inspections').insert(inspectionInserts);

        // Live DVC Generation: Insert into 'certificates' table generating a unique UUID
        if (areAllTestsPassed) {
          const certUuid = crypto.randomUUID();
          const certNumber = session.certificateNumber || `LM/DL/SEC24/${new Date().getFullYear()}/${currentInstrument.serialNumber.slice(-5)}`;
          const qrHash = `0xSEC24_${certUuid.slice(0, 8).toUpperCase()}_${currentInstrument.serialNumber.slice(-6)}`;

          const { error: certErr } = await supabase.from('certificates').insert({
            id: certUuid,
            certificate_number: certNumber,
            instrument_id: instData.id,
            qr_hash: qrHash,
            issue_date: today,
            trader_name: currentInstrument.traderName,
            business_name: currentInstrument.businessName,
            serial_number: currentInstrument.serialNumber,
            approval_date: today,
            expiry_date: nextYear,
            verification_status: 'VERIFIED',
            stamping_fee_paid: currentInstrument.verificationFee,
            lead_seal_number: leadSealNo,
            hologram_number: hologramNo,
            gps_latitude: evidence.gpsCoordinates.latitude,
            gps_longitude: evidence.gpsCoordinates.longitude,
            seal_image_url: evidence.sealImageUrl,
            inspector_name: session.officerName,
            inspector_badge: session.officerBadge,
            zone: session.jurisdictionZone,
          });

          if (!certErr) {
            // Update session with the generated UUID for QR code verification URL
            session.instrument.id = certUuid;
            setCertSession({ ...session, instrument: { ...session.instrument, id: certUuid } });
          }
        }
      }
    } catch (err) {
      console.warn('Supabase inspection sync deferred:', err);
    } finally {
      setIsSubmitting(false);
    }

    if (areAllTestsPassed) {
      toast.success('Inspection verified & geocoded seal evidence recorded!');
    } else {
      toast.warning('Instrument rejected! Maximum Permissible Error exceeded.');
    }
  };

  // Complete and issue certificate fallback
  const handleFinalizeInspection = () => {
    handleFinalizeWithEvidence({
      sealImageUrl: '',
      gpsCoordinates: { latitude: 28.6139, longitude: 77.2090, accuracy: 10 },
      timestampUtc: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with active instrument selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Crosshair className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Field LMO Calibration & Stamping Console
                </h2>
                <Badge variant="outline" className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 text-[10px]">
                  Sec 24 Inspection
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Officer: <span className="font-semibold text-slate-700 dark:text-slate-300">Devansh Jaiswal (LMO-DL-CENTRAL-042)</span> · Zone 1
              </p>
            </div>
          </div>

          {/* Quick Select Instrument */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Active Queue:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {liveInstruments.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => handleSelectInstrument(inst)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium border transition-all ${
                    currentInstrument.id === inst.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {inst.make || 'Scale'} ({inst.maxCapacity}{inst.unit})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instrument Overview Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">User / Trader:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{currentInstrument.businessName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Serial Number:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{currentInstrument.serialNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Accuracy Class:</span>
            <span className="font-semibold">{currentInstrument.accuracyClass}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Capacity Range:</span>
            <span className="font-semibold">{currentInstrument.minCapacity} to {currentInstrument.maxCapacity} {currentInstrument.unit}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Verification Interval (e):</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {currentInstrument.verificationInterval_e} {currentInstrument.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Stamping Fee:</span>
            <span className="font-bold">INR {currentInstrument.verificationFee}.00</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Testing Tabs */}
      <Tabs defaultValue="eccentricity" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1">
            <TabsTrigger value="eccentricity" className="text-xs">
              1. Eccentricity Test (Off-Center)
              {isEccentricityPassed ? (
                <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="ml-1.5 h-3.5 w-3.5 text-rose-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="repeatability" className="text-xs">
              2. Repeatability Test
              {isRepeatabilityPassed ? (
                <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="ml-1.5 h-3.5 w-3.5 text-rose-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="linearity" className="text-xs">
              3. Linearity & Hysteresis
              {isLinearityPassed ? (
                <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="ml-1.5 h-3.5 w-3.5 text-rose-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="physical" className="text-xs">
              4. Physical Security & Sealing
            </TabsTrigger>
          </TabsList>

          {/* Quick Simulation controls for reviewer */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={injectIntentionalError} className="text-xs h-7 text-rose-600 hover:text-rose-700">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Inject Tolerance Breach
            </Button>
            <Button variant="outline" size="sm" onClick={resetAllToCompliant} className="text-xs h-7">
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>

        {/* Tab 1: Eccentricity Test */}
        <TabsContent value="eccentricity">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">Eccentricity Test (Off-Center Load Distribution)</CardTitle>
                  <CardDescription className="text-xs">
                    Apply test load of 1/3 Max ({eccentricLoad} {currentInstrument.unit}) on 5 platform quadrants. Statutory tolerance: ±1.0e (±{currentInstrument.verificationInterval_e} {currentInstrument.unit}).
                  </CardDescription>
                </div>
                <Badge className={isEccentricityPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
                  {isEccentricityPassed ? "PASSED MPE" : "FAILED MPE"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {evaluatedEccentricity.map((reading) => (
                  <div
                    key={reading.positionName}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                      reading.mpeStatus === 'PASS'
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                        : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{reading.positionName}</span>
                      <Badge
                        className={`text-[9px] font-bold px-1 py-0 ${
                          reading.mpeStatus === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {reading.mpeStatus === 'PASS' ? 'PASSED MPE' : 'FAILED MPE'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Applied Load:</span>
                      <span className="font-mono">{reading.testLoad} {currentInstrument.unit}</span>
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Observed Load:</Label>
                      <Input
                        type="number"
                        step="any"
                        value={eccentricReadings[reading.positionName]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEccentricReadings((prev) => ({ ...prev, [reading.positionName]: val }));
                        }}
                        className="h-7 text-xs font-mono mt-1"
                      />
                    </div>
                    <div className="pt-1 flex justify-between items-center">
                      <span className="text-slate-500">Error:</span>
                      <span className={`font-mono font-bold ${reading.mpeStatus === 'PASS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {reading.error >= 0 ? `+${reading.error}` : reading.error}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1">
                      <span>Max Allowed (±1.0e):</span>
                      <span className="font-mono">±{reading.mpe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Repeatability Test */}
        <TabsContent value="repeatability">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">Repeatability Test (Successive Weighing Cycles)</CardTitle>
                  <CardDescription className="text-xs">
                    Apply test load of 50% Max ({repLoad} {currentInstrument.unit}) 3 consecutive times. The difference between indications must not exceed MPE.
                  </CardDescription>
                </div>
                <Badge className={isRepeatabilityPassed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}>
                  {isRepeatabilityPassed ? "PASSED REPEATABILITY" : "FAILED REPEATABILITY"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {evaluatedRepeatability.map((reading) => (
                  <div
                    key={reading.runNumber}
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      reading.isCompliant
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                        : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                    }`}
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200">Cycle #{reading.runNumber}</div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Scale Reading:</Label>
                      <Input
                        type="number"
                        step="any"
                        value={repReadings[reading.runNumber - 1]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const copy = [...repReadings];
                          copy[reading.runNumber - 1] = val;
                          setRepReadings(copy);
                        }}
                        className="h-7 text-xs font-mono mt-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Error:</span>
                      <span className={`font-mono font-bold ${reading.isCompliant ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {reading.error >= 0 ? `+${reading.error}` : reading.error}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Linearity Test */}
        <TabsContent value="linearity">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">Linearity & Error of Indication across Range</CardTitle>
                  <CardDescription className="text-xs">
                    Ascending and descending loads verified against stepped MPE tolerances (±0.5e, ±1.0e, ±1.5e).
                  </CardDescription>
                </div>
                <Badge className={isLinearityPassed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}>
                  {isLinearityPassed ? "PASSED LINEARITY" : "FAILED LINEARITY"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Load Step</th>
                      <th className="p-2.5">Standard Load</th>
                      <th className="p-2.5">Increasing Reading</th>
                      <th className="p-2.5">Decreasing Reading</th>
                      <th className="p-2.5">Statutory MPE</th>
                      <th className="p-2.5 rounded-r-lg">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {evaluatedLinearity.map((step, idx) => (
                      <tr key={idx} className={step.isCompliant ? "" : "bg-rose-50/40 dark:bg-rose-950/20"}>
                        <td className="p-2.5 font-medium">{step.loadStep}</td>
                        <td className="p-2.5 font-mono">{step.appliedLoad} {currentInstrument.unit}</td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="any"
                            value={linearReadings[idx].inc}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const copy = [...linearReadings];
                              copy[idx].inc = val;
                              setLinearReadings(copy);
                            }}
                            className="h-7 w-28 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="any"
                            value={linearReadings[idx].dec}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const copy = [...linearReadings];
                              copy[idx].dec = val;
                              setLinearReadings(copy);
                            }}
                            className="h-7 w-28 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2.5 font-mono font-semibold">±{step.mpe} {currentInstrument.unit}</td>
                        <td className="p-2.5">
                          {step.isCompliant ? (
                            <Badge className="bg-emerald-500 text-white text-[10px]">OK</Badge>
                          ) : (
                            <Badge className="bg-rose-500 text-white text-[10px]">EXCEEDED</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Physical Security & Sealing */}
        <TabsContent value="physical">
          <PhysicalSealingCapture
            instrument={currentInstrument}
            officerName="Devansh Jaiswal"
            officerBadge="LMO-DL-CENTRAL-042"
            leadSealNo={leadSealNo}
            hologramNo={hologramNo}
            onLeadSealChange={setLeadSealNo}
            onHologramChange={setHologramNo}
            physicalChecks={physicalChecks}
            onPhysicalChecksChange={setPhysicalChecks}
            onSubmitFinalInspection={handleFinalizeWithEvidence}
            isSubmitting={isSubmitting}
          />
        </TabsContent>
      </Tabs>

      {/* Action Footer Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ${areAllTestsPassed ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {areAllTestsPassed ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Inspection Status: {areAllTestsPassed ? 'READY FOR STAMPING' : 'FAILED STATUTORY TOLERANCE'}
            </div>
            <div className="text-xs text-slate-500">
              {areAllTestsPassed
                ? 'All OIML R-76 calibration tests within MPE. Ready to issue Section 24 certificate.'
                : 'One or more calibration tests breached maximum permissible error limit.'}
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="lg"
            onClick={handleFinalizeInspection}
            className={`w-full sm:w-auto ${
              areAllTestsPassed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <Award className="mr-2 h-4 w-4" />
            {areAllTestsPassed ? 'Certify, Stamp & Issue Certificate' : 'Issue Rejection Memorandum'}
          </Button>
        </div>
      </div>

      {/* Certificate Viewer Modal */}
      <CertificateViewerModal
        session={certSession}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export const FieldInspectorConsole = FieldLMOConsole;
export default FieldLMOConsole;
