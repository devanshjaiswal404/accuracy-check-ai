import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Download, Award, Calendar, QrCode, Camera, MapPin } from 'lucide-react';
import type { InspectionSession } from '@/types/metrology';
import { generateVerificationCertificatePdf } from '@/lib/pdf';

interface CertificateViewerModalProps {
  session: InspectionSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateViewerModal({ session, isOpen, onClose }: CertificateViewerModalProps) {
  if (!session) return null;

  const isVerified = session.overallStatus === 'VERIFIED';

  const handleDownload = () => {
    generateVerificationCertificatePdf(session);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800">
        {/* Certificate Header Banner */}
        <div className="bg-slate-900 text-white p-6 rounded-t-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
            <Award className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Government of India · Department of Consumer Affairs
            </div>
            <h2 className="text-xl font-bold tracking-tight font-display">
              {isVerified ? "CERTIFICATE OF VERIFICATION" : "MEMORANDUM OF REJECTION"}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Issued under Section 24 of the Legal Metrology Act, 2009 & General Rules, 2011
            </p>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 space-y-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm">
          {/* Top Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Certificate No:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {session.certificateNumber || "PENDING"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Stamping Date:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{session.inspectionDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Validity Expiry:</span>
              <span className={`font-semibold ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {session.nextDueDate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Status:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                isVerified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800'
              }`}>
                {session.overallStatus}
              </span>
            </div>
          </div>

          {/* Trader & Premise */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Commercial User / Trader Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Business Name:</span>{' '}
                <span className="font-semibold">{session.instrument.businessName}</span>
              </div>
              <div>
                <span className="text-slate-500">Trader / Proprietor:</span>{' '}
                <span className="font-semibold">{session.instrument.traderName}</span>
              </div>
              <div>
                <span className="text-slate-500">Trade License:</span>{' '}
                <span className="font-mono font-medium">{session.instrument.tradeLicenseNo}</span>
              </div>
              <div>
                <span className="text-slate-500">Premises:</span>{' '}
                <span>{session.instrument.address}, {session.instrument.district}</span>
              </div>
            </div>
          </div>

          {/* Instrument Specs */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Verified Instrument Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Instrument Type:</span>
                <span className="font-medium">{session.instrument.instrumentType.replace(/_/g, " ")}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Make & Model:</span>
                <span className="font-medium">{session.instrument.make} - {session.instrument.model}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{session.instrument.serialNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Accuracy Class:</span>
                <span className="font-semibold">{session.instrument.accuracyClass.replace(/_/g, " ")}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Capacity (Min - Max):</span>
                <span className="font-semibold">{session.instrument.minCapacity} {session.instrument.unit} - {session.instrument.maxCapacity} {session.instrument.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Intervals (e / d):</span>
                <span className="font-semibold">e = {session.instrument.verificationInterval_e} {session.instrument.unit} (d = {session.instrument.scaleInterval_d})</span>
              </div>
            </div>
          </div>

          {/* Physical Security & Seal ID */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Physical Government Stamping & Seal
                </span>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Lead Seal No:</span>{' '}
                    <span className="font-mono font-bold">{session.leadSealNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Hologram ID:</span>{' '}
                    <span className="font-mono font-bold">{session.hologramNumber || 'N/A'}</span>
                  </div>
                  {session.gpsCoordinates && (
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <MapPin className="w-3 h-3" />
                      <span className="font-mono font-medium">
                        {session.gpsCoordinates.latitude.toFixed(4)}° N, {session.gpsCoordinates.longitude.toFixed(4)}° E
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-sm">
                <QrCode className="h-8 w-8" />
              </div>
            </div>

            {/* Geotagged Photographic Proof */}
            {session.sealImageUrl && (
              <div className="pt-2 border-t border-amber-500/20">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                  <span className="font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    Geotagged Anti-Tamper Photographic Evidence
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Sec 24 Encrypted Archive
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-950 flex items-center justify-center">
                  <img
                    src={session.sealImageUrl}
                    alt="Geotagged physical seal evidence"
                    className="w-full max-h-48 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer certification */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <div>
              <span>Inspected & Certified By:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{session.officerName}</span> ({session.officerBadge})
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(`/certificate?id=${encodeURIComponent(session.instrument.id || session.instrument.serialNumber)}`, '_blank');
                  }
                }}
              >
                <Award className="w-3.5 h-3.5 mr-1.5" />
                Open Formal A4 DVC
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
