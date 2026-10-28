import React from "react";
import type { MatchBand, ApplicationStatusEnum } from "../types";

interface MatchBadgeProps {
  score: number;
  band: MatchBand;
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ score, band }) => {
  const styles: Record<MatchBand, string> = {
    STRONG: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MODERATE: "bg-amber-50 text-amber-700 border-amber-200",
    WEAK: "bg-rose-50 text-rose-700 border-rose-200"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[band]}`}
    >
      <span>{score.toFixed(1)}%</span>
      <span className="opacity-75">•</span>
      <span>{band}</span>
    </span>
  );
};

interface StatusBadgeProps {
  status: ApplicationStatusEnum;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<ApplicationStatusEnum, string> = {
    APPLIED: "bg-slate-100 text-slate-700 border-slate-200",
    SHORTLISTED: "bg-blue-50 text-blue-700 border-blue-200",
    INTERVIEW: "bg-purple-50 text-purple-700 border-purple-200",
    OFFER: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200"
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
};