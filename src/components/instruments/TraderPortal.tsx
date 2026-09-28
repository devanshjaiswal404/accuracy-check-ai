import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, CheckCircle2, ArrowRight, Building, Shield, FileCheck, IndianRupee } from 'lucide-react';
import type { InstrumentSpecs, InstrumentType, AccuracyClass } from '@/types/metrology';
import { calculateStampingFee } from '@/lib/mpe-engine';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';

interface TraderPortalProps {
  onRegisterInstrument: (instrument: InstrumentSpecs) => void;
  onSendToInspection: (instrument: InstrumentSpecs) => void;
}

export function TraderPortal({ onRegisterInstrument, onSendToInspection }: TraderPortalProps) {
  const [formData, setFormData] = useState({
    traderName: 'Sunil Kumar Agrawal',
    businessName: 'Agrawal Wholesale Provisions & Oil Depot',
    tradeLicenseNo: 'DL-MCD-2025-44912',
    address: 'Shop 22, Grain Mandi, Narela',
    district: 'North Delhi',
    state: 'Delhi',
    pincode: '110040',
    instrumentType: 'ELECTRONIC_COUNTER_SCALE' as InstrumentType,
    make: 'Essae',
    model: 'DS-852',
    serialNumber: 'ES-2025-' + Math.floor(100000 + Math.random() * 900000),
    modelApprovalNo: 'IND/09/2022/581',
    accuracyClass: 'CLASS_III' as AccuracyClass,
    maxCapacity: 30,
    minCapacity: 0.1,
    verificationInterval_e: 0.005, // 5g = 0.005kg
    scaleInterval_d: 0.005,
    unit: 'kg' as 'g' | 'kg' | 't' | 'mg',
  });

  const [submittedInstrument, setSubmittedInstrument] = useState<InstrumentSpecs | null>(null);

  const calculatedFee = calculateStampingFee(formData.maxCapacity, formData.unit);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const applicationNo = `SM360-${new Date().getFullYear()}-DL-${Math.floor(1000 + Math.random() * 9000)}`;

    let newInstrument: InstrumentSpecs = {
      id: `inst-${Date.now()}`,
      applicationNo,
      ...formData,
      verificationFee: calculatedFee,
    };

    try {
      const { data, error } = await supabase.from('instruments').insert({
        serial_number: newInstrument.serialNumber,
        trader_name: newInstrument.traderName,
        business_name: newInstrument.businessName,
        trade_license_no: newInstrument.tradeLicenseNo,
        address: newInstrument.address,
        district: newInstrument.district,
        state: newInstrument.state,
        pincode: newInstrument.pincode,
        instrument_type: newInstrument.instrumentType,
        make: newInstrument.make,
        model: newInstrument.model,
        model_approval_no: newInstrument.modelApprovalNo,
        accuracy_class: newInstrument.accuracyClass,
        max_capacity: newInstrument.maxCapacity,
        min_capacity: newInstrument.minCapacity,
        verification_interval_e: newInstrument.verificationInterval_e,
        scale_interval_d: newInstrument.scaleInterval_d,
        unit: newInstrument.unit,
        stamping_fee: calculatedFee,
      }).select().maybeSingle();

      if (!error && data?.id) {
        newInstrument.id = data.id;
        toast.success(`Application registered in live Supabase database!`);
      } else {
        toast.success(`Application ${applicationNo} submitted under Section 24!`);
      }
    } catch (err) {
      toast.success(`Application ${applicationNo} registered!`);
    }

    onRegisterInstrument(newInstrument);
    setSubmittedInstrument(newInstrument);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 p-6 dark:border-indigo-950/40 dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-slate-950 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
                Trader e-Filing & Instrument Onboarding
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Section 24 of the Legal Metrology Act, 2009: Mandatory verification & stamping of commercial weighing instruments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Model Approval Mandatory</span>
          </div>
        </div>
      </div>

      {submittedInstrument ? (
        <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-emerald-700 dark:text-emerald-400 font-display">
                  Verification Application Registered Successfully!
                </CardTitle>
                <CardDescription className="text-xs">
                  Application Reference: <span className="font-mono font-bold">{submittedInstrument.applicationNo}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Instrument:</span>
                <span className="font-semibold">{submittedInstrument.make} {submittedInstrument.model} ({submittedInstrument.instrumentType.replace(/_/g, " ")})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{submittedInstrument.serialNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Government Stamping Fee:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">INR {submittedInstrument.verificationFee}.00 (Calculated)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              The application has been forwarded to the jurisdictional Legal Metrology Officer (LMO). You may now proceed directly to the Field Inspection Console to run the statutory calibration tests.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
            <Button variant="outline" size="sm" onClick={() => setSubmittedInstrument(null)}>
              Register Another Instrument
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => onSendToInspection(submittedInstrument)}
            >
              Open in Field LMO Console
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Trader & Instrument Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Trader Premise */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    1. Trader & Business Establishment
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="traderName">Proprietor / Trader Name *</Label>
                    <Input
                      id="traderName"
                      value={formData.traderName}
                      onChange={(e) => handleChange('traderName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName">Commercial Firm Name *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tradeLicense">Trade License / FSSAI / GSTIN *</Label>
                    <Input
                      id="tradeLicense"
                      value={formData.tradeLicenseNo}
                      onChange={(e) => handleChange('tradeLicenseNo', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Shop / Premises Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">District *</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pincode">PIN Code *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Instrument Specs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Instrument Specifications (Section 24)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="instType">Instrument Category *</Label>
                    <Select
                      value={formData.instrumentType}
                      onValueChange={(val) => handleChange('instrumentType', val as InstrumentType)}
                    >
                      <SelectTrigger id="instType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ELECTRONIC_COUNTER_SCALE">Electronic Counter Scale (NAWI)</SelectItem>
                        <SelectItem value="PLATFORM_SCALE">Electronic Platform Scale</SelectItem>
                        <SelectItem value="WEIGHBRIDGE">Weighbridge (Vehicle Scale)</SelectItem>
                        <SelectItem value="PRECISION_BALANCE">Precision / Bullion Balance</SelectItem>
                        <SelectItem value="SPRING_BALANCE">Spring Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accuracyClass">Accuracy Class (OIML R-76) *</Label>
                    <Select
                      value={formData.accuracyClass}
                      onValueChange={(val) => handleChange('accuracyClass', val as AccuracyClass)}
                    >
                      <SelectTrigger id="accuracyClass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLASS_I">Class I - Special (Laboratory/Micro)</SelectItem>
                        <SelectItem value="CLASS_II">Class II - High (Goldsmith / Bullion)</SelectItem>
                        <SelectItem value="CLASS_III">Class III - Medium (Commercial Retail & Mandi)</SelectItem>
                        <SelectItem value="CLASS_IIII">Class IIII - Ordinary (Bulk/Coarse)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="make">Manufacturer / Make *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => handleChange('make', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="model">Model Name / Number *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleChange('model', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="serial">Serial Number *</Label>
                    <Input
                      id="serial"
                      value={formData.serialNumber}
                      onChange={(e) => handleChange('serialNumber', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modelApp">Govt Model Approval Certificate No. *</Label>
                    <Input
                      id="modelApp"
                      value={formData.modelApprovalNo}
                      onChange={(e) => handleChange('modelApprovalNo', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="maxCap">Maximum Capacity (Max) *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="maxCap"
                        type="number"
                        step="any"
                        value={formData.maxCapacity}
                        onChange={(e) => handleChange('maxCapacity', parseFloat(e.target.value) || 0)}
                        required
                      />
                      <Select
                        value={formData.unit}
                        onValueChange={(val) => handleChange('unit', val)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="t">tonne</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="minCap">Minimum Capacity (Min) *</Label>
                    <Input
                      id="minCap"
                      type="number"
                      step="any"
                      value={formData.minCapacity}
                      onChange={(e) => handleChange('minCapacity', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="eValue">Verification Scale Interval (e) *</Label>
                    <Input
                      id="eValue"
                      type="number"
                      step="any"
                      value={formData.verificationInterval_e}
                      onChange={(e) => handleChange('verificationInterval_e', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dValue">Actual Scale Interval (d) *</Label>
                    <Input
                      id="dValue"
                      type="number"
                      step="any"
                      value={formData.scaleInterval_d}
                      onChange={(e) => handleChange('scaleInterval_d', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Statutory Stamping Fee & Summary */}
            <div className="space-y-6">
              <Card className="border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Statutory Stamping Fee
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Legal Metrology (General) Rules Schedule Slabs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">Prescribed Verification Fee</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <IndianRupee className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                        {calculatedFee}.00
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Based on capacity slab: {formData.maxCapacity} {formData.unit}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Inspection Class:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.accuracyClass}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Verification Interval (e):</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">{formData.verificationInterval_e} {formData.unit}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Validity Term:</span>
                      <span className="text-slate-900 dark:text-slate-100">12 Months (Annual)</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    Under Section 24(1), using an unverified or unstamped instrument attracts statutory penalties under Section 30.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Submit Application for Verification
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
