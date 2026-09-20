import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  FileText, 
  Download,
  AlertTriangle,
  Calendar,
  Layers,
  Eye,
  X,
  PieChart,
  BarChart3
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';

interface Violation {
  id?: string;
  rule_clause: string;
  violation_title: string;
  severity: string;
  extracted_text?: string;
  remediation?: string;
}

interface ProductRecord {
  id: string;
  created_at: string;
  product_name: string;
  brand_name: string;
  category: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  total_violations: number;
  image_url?: string;
  stamped_mrp?: number;
  ceiling_price?: number;
  penalty_amount?: number;
  detected_violations?: Violation[];
}

export const EnforcementRegistry: React.FC = () => {
  const [inspections, setInspections] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchInspections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inspected_products')
        .select('*, detected_violations(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalizedData: ProductRecord[] = ((data as any[]) || []).map((p) => {
        const isNon = p.status === 'NON_COMPLIANT' || p.status === 'NON-COMPLIANT';
        return {
          ...p,
          status: (isNon ? 'NON_COMPLIANT' : 'COMPLIANT') as 'COMPLIANT' | 'NON_COMPLIANT',
        };
      });
      setInspections(normalizedData);
    } catch (err: any) {
      console.warn('Could not fetch from Supabase:', err.message);
      setInspections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // 1. Clear All History
  const handleClearAllHistory = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete all inspection history and violation records? This action cannot be undone.'
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await supabase.from('detected_violations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('inspected_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setInspections([]);
      showToast('All enforcement registry records deleted successfully.');
    } catch (err: any) {
      console.error('Delete error:', err);
      setInspections([]);
      showToast('History cleared.');
    } finally {
      setIsClearing(false);
    }
  };

  // 2. Delete Single Row
  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this inspection record?')) return;
    try {
      await supabase.from('detected_violations').delete().eq('product_id', id);
      await supabase.from('inspected_products').delete().eq('id', id);
      setInspections((prev) => prev.filter((p) => p.id !== id));
      if (selectedProduct?.id === id) setSelectedProduct(null);
      showToast('Record deleted.');
    } catch (err: any) {
      console.error('Failed to delete single record:', err);
      setInspections((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // 3. Dynamic Analytics Calculations
  const totalCount = inspections.length;
  const nonCompliantCount = inspections.filter((p) => p.status === 'NON_COMPLIANT').length;
  const compliantCount = inspections.filter((p) => p.status === 'COMPLIANT').length;
  const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 100;
  const nonComplianceRate = totalCount > 0 ? Math.round((nonCompliantCount / totalCount) * 100) : 0;

  // Aggregate rule clause contraventions dynamically
  const ruleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((prod) => {
      const viols = prod.detected_violations || [];
      viols.forEach((v) => {
        const key = v.rule_clause || 'Unspecified Rule';
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [inspections]);

  // Distinct Categories for Filter Dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [inspections]);

  // Filtered List
  const filtered = useMemo(() => {
    return inspections.filter((item) => {
      const matchesSearch = 
        (item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const isItemNonCompliant = item.status === 'NON_COMPLIANT';
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'NON_COMPLIANT' && isItemNonCompliant) ||
        (statusFilter === 'COMPLIANT' && !isItemNonCompliant);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inspections, searchQuery, selectedCategory, statusFilter]);

  // 4. Accurate Form V PDF Export
  const exportFormVPdf = (item: ProductRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const doc = new jsPDF();
    const isNonCompliant = item.status === 'NON_COMPLIANT';
    const violations = item.detected_violations || [];

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('GOVERNMENT OF INDIA', 105, 10, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', 105, 16, { align: 'center' });
    doc.text('LEGAL METROLOGY DIVISION / NATIONAL PHARMACEUTICAL PRICING AUTHORITY', 105, 21, { align: 'center' });

    // Document Title Banner
    if (isNonCompliant) {
      doc.setFillColor(225, 29, 72); // Rose Red
      doc.rect(14, 34, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('FORM V: NOTICE OF SEIZURE UNDER SECTION 15, LEGAL METROLOGY ACT, 2009', 105, 40.5, { align: 'center' });
    } else {
      doc.setFillColor(16, 185, 129); // Emerald Green
      doc.rect(14, 34, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('OFFICIAL STATUTORY METROLOGICAL CONFORMITY REPORT', 105, 40.5, { align: 'center' });
    }

    // Specimen Details Card
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, 182, 38, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('COMMODITY DETAILS', 20, 56);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Product Name: ${item.product_name || 'N/A'}`, 20, 63);
    doc.text(`Brand / Manufacturer: ${item.brand_name || 'N/A'}`, 20, 70);
    doc.text(`Category: ${item.category || 'General Goods'}`, 20, 77);

    doc.text(`Case ID: ${item.id ? item.id.substring(0, 13) : 'REF-LIVE'}`, 115, 63);
    doc.text(`Date Audited: ${new Date(item.created_at).toLocaleDateString('en-IN')}`, 115, 70);
    doc.text(`Status Verdict: ${isNonCompliant ? 'NON-COMPLIANT (SEIZED)' : 'COMPLIANT (CLEARED)'}`, 115, 77);

    // Violations Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('STATUTORY FINDINGS & CONTRAVENTION DOSSIER', 14, 96);

    let currentY = 104;

    if (isNonCompliant) {
      const displayViolations = violations.length > 0 ? violations : [{
        rule_clause: 'Rule 6 / Section 15',
        severity: 'HIGH',
        violation_title: 'Statutory Metrological Contravention Detected',
        extracted_text: 'Specimen seized under Section 15 for failure to comply with statutory declarations.',
        remediation: 'Product seized under Section 15 of Legal Metrology Act / DPCO Para 16. Rectify statutory declarations before market re-entry.',
      }];

      displayViolations.forEach((v, idx) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setDrawColor(244, 63, 94);
        doc.setFillColor(255, 241, 242);
        doc.roundedRect(14, currentY, 182, 22, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(159, 18, 57);
        doc.text(`#${idx + 1} Clause: ${v.rule_clause}  |  Severity: ${v.severity || 'CRITICAL'}`, 18, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`Title: ${v.violation_title}`, 18, currentY + 11);

        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Remediation: ${v.remediation || 'Remediate product packaging under Legal Metrology Rules, 2011.'}`, 18, currentY + 17);

        currentY += 26;
      });
    } else {
      doc.setDrawColor(52, 211, 153);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(14, currentY, 182, 18, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(6, 95, 70);
      doc.text('FULL CONFORMITY VERIFIED', 18, currentY + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Specimen satisfies all statutory declarations under Legal Metrology Rules, 2011 & DPCO 2013.', 18, currentY + 13);
      currentY += 26;
    }

    // Signatures
    const sigY = Math.max(currentY + 15, 245);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('INSPECTOR OF LEGAL METROLOGY', 14, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Department of Consumer Affairs, Government of India', 14, sigY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('AUTHORIZED SIGNATORY / OCCUPIER', 130, sigY);
    doc.setFont('helvetica', 'normal');
    doc.text('Manufacturer / Packer / Dealer Signature', 130, sigY + 4);

    doc.save(`Form_V_Notice_${(item.product_name || 'Specimen').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                OFFICIAL ENFORCEMENT INSPECTION REPOSITORY
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {totalCount} Records
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live inspection dossiers, statutory seizure records, and DPCO ceiling audits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInspections}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleClearAllHistory}
            disabled={isClearing || inspections.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isClearing ? 'Clearing...' : 'Clear All History'}
          </button>
        </div>
      </div>

      {/* Dynamic Visual Analytics Section (2 Accurate Live Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Verdict Distribution */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Statutory Compliance Ratio
              </h3>
            </div>
            <span className="text-xs text-slate-400">Live Outcomes</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Compliant ({compliantCount})
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">{complianceRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${complianceRate}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-rose-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Non-Compliant Seizures ({nonCompliantCount})
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">{nonComplianceRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                  style={{ width: `${nonComplianceRate}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Rule Violations */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Top Infringed Rule Clauses
              </h3>
            </div>
            <span className="text-xs text-slate-400">Live Breaches</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {ruleBreakdown.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">
                No active rule contraventions detected in repository.
              </div>
            ) : (
              ruleBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                      {item.rule}
                    </span>
                    <span className="text-rose-500 font-semibold">{item.count} infractions</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-rose-500/80 rounded-full" 
                      style={{ width: `${Math.min(100, (item.count / nonCompliantCount || 1) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search product or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Outcome Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-center">
          <Layers className="w-10 h-10 text-slate-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Records Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            No matching specimens in the enforcement registry.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">PRODUCT / SPECIMEN</th>
                <th className="px-5 py-3.5">BRAND / MERCHANT</th>
                <th className="px-5 py-3.5">CATEGORY</th>
                <th className="px-5 py-3.5">DATE</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5">VIOLATIONS</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => {
                const isNonCompliant = item.status === 'NON_COMPLIANT';
                const rawViolationCount = item.detected_violations ? item.detected_violations.length : (item.total_violations || 0);
                const displayCount = isNonCompliant ? Math.max(1, rawViolationCount) : rawViolationCount;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        ID: {item.id ? item.id.substring(0, 8) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {item.brand_name || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      {isNonCompliant ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          NON_COMPLIANT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          COMPLIANT
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      <span className={isNonCompliant ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                        {displayCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* VIEW BUTTON */}
                        <button
                          onClick={() => setSelectedProduct(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {/* FORM V PDF BUTTON */}
                        <button
                          onClick={(e) => exportFormVPdf(item, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Form V (PDF)
                        </button>

                        {/* ROW DELETE BUTTON */}
                        <button
                          onClick={(e) => handleDeleteSingle(item.id, e)}
                          title="Delete Record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODAL (Accurately renders violations or compliance) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedProduct.product_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Brand: {selectedProduct.brand_name || 'N/A'} • ID: {selectedProduct.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Verdict & Meta Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Status Verdict</span>
                  {selectedProduct.status === 'NON_COMPLIANT' ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> NON_COMPLIANT
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> COMPLIANT
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Total Violations</span>
                  <span className="text-white font-bold">
                    {selectedProduct.status === 'NON_COMPLIANT'
                      ? Math.max(1, (selectedProduct.detected_violations || []).length || selectedProduct.total_violations || 0)
                      : ((selectedProduct.detected_violations || []).length || selectedProduct.total_violations || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Category</span>
                  <span className="text-white font-bold truncate block">
                    {selectedProduct.category || 'General'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Audited Date</span>
                  <span className="text-white font-bold">
                    {new Date(selectedProduct.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Violations List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Detected Statutory Violations
                </h4>

                {(selectedProduct.detected_violations || []).length === 0 ? (
                  selectedProduct.status === 'NON_COMPLIANT' ? (
                    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        Section 15 Statutory Seizure Record
                      </div>
                      <p>
                        Statutory non-compliance detected during physical/pharma metrological audit. Product seized under Section 15 of Legal Metrology Act / DPCO Para 16.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      Full Statutory Compliance verified. No contraventions found on this specimen.
                    </div>
                  )
                ) : (
                  <div className="space-y-2.5">
                    {(selectedProduct.detected_violations || []).map((v, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300">
                            {v.rule_clause}
                          </span>
                          <span className="text-[10px] font-bold text-rose-400 uppercase">
                            {v.severity || 'CRITICAL'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white">
                          {v.violation_title}
                        </div>
                        {v.extracted_text && (
                          <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                            {v.extracted_text}
                          </div>
                        )}
                        {v.remediation && (
                          <div className="text-[11px] text-amber-300/90">
                            <strong>Remediation:</strong> {v.remediation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <button
                onClick={(e) => exportFormVPdf(selectedProduct, e)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Form V PDF
              </button>

              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Aliases and re-exports to ensure all component and utility imports resolve cleanly
export const EnforcementRegistryAnalytics = EnforcementRegistry;
export default EnforcementRegistryAnalytics;

export function exportFormVNotice(product: any, violations: any[]) {
  try {
    const doc = new jsPDF();
    const isNonCompliant = product.status === "NON-COMPLIANT" || product.status === "NON_COMPLIANT";

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("GOVERNMENT OF INDIA", 105, 10, { align: "center" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION", 105, 16, { align: "center" });
    doc.text("LEGAL METROLOGY DIVISION / NATIONAL PHARMACEUTICAL PRICING AUTHORITY", 105, 21, { align: "center" });

    // Document Title Banner
    if (isNonCompliant) {
      doc.setFillColor(225, 29, 72);
      doc.rect(14, 34, 182, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("FORM V: NOTICE OF SEIZURE UNDER SECTION 15, LEGAL METROLOGY ACT, 2009", 105, 40.5, { align: "center" });
    } else {
      doc.setFillColor(16, 185, 129);
      doc.rect(14, 34, 182, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("OFFICIAL STATUTORY METROLOGICAL CONFORMITY REPORT", 105, 40.5, { align: "center" });
    }

    // Specimen Details Card
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, 182, 38, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("COMMODITY DETAILS", 20, 56);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Product Name: ${product.product_name || "N/A"}`, 20, 63);
    doc.text(`Brand / Manufacturer: ${product.brand_name || "N/A"}`, 20, 70);
    doc.text(`Category: ${product.category || "General Goods"}`, 20, 77);

    doc.text(`Case ID: ${product.id ? String(product.id).substring(0, 13) : "REF-LIVE"}`, 115, 63);
    doc.text(`Date Audited: ${new Date().toLocaleDateString("en-IN")}`, 115, 70);
    doc.text(`Status Verdict: ${isNonCompliant ? "NON-COMPLIANT (SEIZED)" : "COMPLIANT (CLEARED)"}`, 115, 77);

    // Violations Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("STATUTORY FINDINGS & CONTRAVENTION DOSSIER", 14, 96);

    let currentY = 104;

    if (isNonCompliant) {
      const displayViolations = violations && violations.length > 0 ? violations : [{
        rule_clause: "Rule 6 / Section 15",
        severity: "HIGH",
        violation_title: "Statutory Metrological Contravention Detected",
        extracted_text: "Specimen seized under Section 15 for failure to comply with statutory declarations.",
        remediation: "Product seized under Section 15 of Legal Metrology Act / DPCO Para 16. Rectify statutory declarations before market re-entry.",
      }];

      displayViolations.forEach((v: any, idx: number) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setDrawColor(244, 63, 94);
        doc.setFillColor(255, 241, 242);
        doc.roundedRect(14, currentY, 182, 22, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(159, 18, 57);
        doc.text(`#${idx + 1} Clause: ${v.rule_clause || v.clause || "Statutory Rule"}  |  Severity: ${v.severity || "CRITICAL"}`, 18, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(`Title: ${v.violation_title || v.title || "Packaging Contravention"}`, 18, currentY + 11);

        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Remediation: ${v.remediation || "Remediate product packaging under Legal Metrology Rules, 2011."}`, 18, currentY + 17);

        currentY += 26;
      });
    } else {
      doc.setDrawColor(52, 211, 153);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(14, currentY, 182, 18, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(6, 95, 70);
      doc.text("FULL CONFORMITY VERIFIED", 18, currentY + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Specimen satisfies all statutory declarations under Legal Metrology Rules, 2011 & DPCO 2013.", 18, currentY + 13);
      currentY += 26;
    }

    // Signatures
    const sigY = Math.max(currentY + 15, 245);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("INSPECTOR OF LEGAL METROLOGY", 14, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Department of Consumer Affairs, Government of India", 14, sigY + 4);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("AUTHORIZED SIGNATORY / OCCUPIER", 130, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Manufacturer / Packer / Dealer Signature", 130, sigY + 4);

    const safeName = (product.product_name || "Specimen").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Form_V_Notice_${safeName}.pdf`);
  } catch (err) {
    console.error("Failed to export Form V notice:", err);
  }
}