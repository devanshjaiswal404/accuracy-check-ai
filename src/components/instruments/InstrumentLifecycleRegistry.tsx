import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  FileText,
  Download,
  IndianRupee,
  Layers,
  ChevronRight,
  ExternalLink,
  Award,
} from 'lucide-react';
import type { InstrumentSpecs, InspectionSession, VerificationStatus } from '@/types/metrology';
import { CertificateViewerModal } from './CertificateViewerModal';
import { generateVerificationCertificatePdf } from '@/lib/pdf';

interface InstrumentLifecycleRegistryProps {
  sessions: InspectionSession[];
  onOpenInspection: (instrument: InstrumentSpecs) => void;
  onOpenFullCertificate?: (session: InspectionSession) => void;
}

export function InstrumentLifecycleRegistry({
  sessions,
  onOpenInspection,
  onOpenFullCertificate,
}: InstrumentLifecycleRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');

  const [activeModalSession, setActiveModalSession] = useState<InspectionSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute Registry Statistics
  const totalCount = sessions.length;
  const verifiedCount = sessions.filter((s) => s.overallStatus === 'VERIFIED').length;
  const rejectedCount = sessions.filter((s) => s.overallStatus === 'REJECTED').length;
  const totalRevenue = sessions.reduce((acc, curr) => acc + (curr.stampingFeePaid || 0), 0);
  const complianceRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  // Filtered rows
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus = statusFilter === 'ALL' || s.overallStatus === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.instrument.serialNumber.toLowerCase().includes(q) ||
        s.instrument.traderName.toLowerCase().includes(q) ||
        s.instrument.businessName.toLowerCase().includes(q) ||
        (s.certificateNumber && s.certificateNumber.toLowerCase().includes(q)) ||
        s.instrument.district.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [sessions, statusFilter, search]);

  const handleOpenCertificate = (session: InspectionSession) => {
    setActiveModalSession(session);
    setIsModalOpen(true);
  };

  const handleDownloadPdf = (e: React.MouseEvent, session: InspectionSession) => {
    e.stopPropagation();
    generateVerificationCertificatePdf(session);
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Instruments</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Compliance Rate */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Verification Rate</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {complianceRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Non-Compliant / Rejected */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Tolerance Breached</span>
              <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{rejectedCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Stamping Revenue */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Govt Stamping Revenue</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Search & Table Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold font-display uppercase tracking-wider">
                Instrument Verification & Stamping Registry
              </CardTitle>
              <CardDescription className="text-xs">
                Official repository of commercial weighing instruments verified under Section 24 of Legal Metrology Act, 2009.
              </CardDescription>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial number, trader name, business, district, or certificate number…"
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No instrument verification records match your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Instrument & Serial</th>
                    <th className="p-3">Trader & Establishment</th>
                    <th className="p-3">Capacity & Class</th>
                    <th className="p-3">Stamping Date</th>
                    <th className="p-3">Valid Until</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSessions.map((session, idx) => {
                    const isVerified = session.overallStatus === 'VERIFIED';
                    return (
                      <tr
                        key={idx}
                        onClick={() => handleOpenCertificate(session)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {session.instrument.make} {session.instrument.model}
                          </div>
                          <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                            SN: {session.instrument.serialNumber}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {session.instrument.businessName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {session.instrument.traderName} · {session.instrument.district}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            {session.instrument.maxCapacity} {session.instrument.unit}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {session.instrument.accuracyClass.replace(/_/g, ' ')} (e={session.instrument.verificationInterval_e})
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {session.inspectionDate}
                        </td>
                        <td className="p-3 font-medium">
                          <span className={isVerified ? 'text-emerald-600' : 'text-rose-500'}>
                            {session.nextDueDate}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                          >
                            {session.overallStatus}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {onOpenFullCertificate && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                onClick={() => onOpenFullCertificate(session)}
                                title="View Formal A4 DVC Certificate"
                              >
                                <Award className="h-3 w-3 mr-1" />
                                Formal DVC
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleOpenCertificate(session)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Summary
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                              onClick={(e) => handleDownloadPdf(e, session)}
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Modal */}
      <CertificateViewerModal
        session={activeModalSession}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
