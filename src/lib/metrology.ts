// Re-export and compatibility types for Legal Metrology Act, 2009 Section 24
export * from '@/types/metrology';

export type CheckStatus = "pass" | "violation" | "review";
export type AuditStatus = "COMPLIANT" | "NON-COMPLIANT" | "REVIEW" | "VERIFIED" | "REJECTED";

export interface ClauseCheck {
  clause: string;
  title: string;
  status: CheckStatus;
  severity: "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  extracted?: string | undefined;
  remediation?: string | undefined;
}
