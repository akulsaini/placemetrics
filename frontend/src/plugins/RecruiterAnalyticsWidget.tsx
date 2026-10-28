import React from "react";
import {
  BarChart3,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Award,
  Layers
} from "lucide-react";
import type {
  CandidatesOut,
  BranchEnum,
  ApplicationStatusEnum
} from "../types";

interface RecruiterAnalyticsWidgetProps {
  candidatesData: CandidatesOut;
}

const RecruiterAnalyticsWidget: React.FC<RecruiterAnalyticsWidgetProps> = ({
  candidatesData
}) => {
  const { candidates, total_candidates, eligible_count, strong_match_count, job } =
    candidatesData;

  const avgScore =
    total_candidates > 0
      ? candidates.reduce((acc, c) => acc + c.evaluation.score.overall_score, 0) /
        total_candidates
      : 0;

  const avgSemantic =
    total_candidates > 0
      ? candidates.reduce((acc, c) => acc + c.evaluation.score.semantic_score, 0) /
        total_candidates
      : 0;

  const moderateCount = candidates.filter(
    (c) => c.evaluation.score.match_band === "MODERATE"
  ).length;
  const weakCount = candidates.filter(
    (c) => c.evaluation.score.match_band === "WEAK"
  ).length;

  const eligibilityRate =
    total_candidates > 0 ? Math.round((eligible_count / total_candidates) * 100) : 0;

  // Branch distribution
  const branchCounts = candidates.reduce<Record<string, number>>((acc, curr) => {
    const b = curr.student.branch;
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {});

  // Pipeline status counts
  const statusCounts = candidates.reduce<Record<ApplicationStatusEnum, number>>(
    (acc, curr) => {
      if (curr.application) {
        acc[curr.application.status] = (acc[curr.application.status] || 0) + 1;
      }
      return acc;
    },
    {
      APPLIED: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0
    }
  );

  // Top matched required skills across candidate pool
  const skillCoverage = job.required_skills.map((reqSkill) => {
    const matchedCount = candidates.filter((c) =>
      c.evaluation.score.matched_required_skills.some(
        (m) => m.toLowerCase() === reqSkill.toLowerCase()
      )
    ).length;
    const pct =
      total_candidates > 0 ? Math.round((matchedCount / total_candidates) * 100) : 0;
    return { skill: reqSkill, matchedCount, pct };
  });

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              AI Cohort & Talent Analytics — {job.title}
            </h3>
            <p className="text-xs text-slate-500">
              Real-time skill gap, eligibility, and ATS funnel telemetry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
            Avg Semantic Score: <strong>{avgSemantic.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>COHORT AVG MATCH</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {avgScore.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              across {total_candidates} candidates
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>ELIGIBILITY PASS RATE</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {eligibilityRate}%
            </span>
            <span className="text-xs text-slate-500">
              ({eligible_count} of {total_candidates} eligible)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>MATCH BAND SPLIT</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
              {strong_match_count} Strong
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">
              {moderateCount} Mod
            </span>
            <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">
              {weakCount} Weak
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>ATS PIPELINE STAGE</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="rounded bg-slate-200/80 px-2 py-0.5 text-slate-700">
              App: {statusCounts.APPLIED}
            </span>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
              Short: {statusCounts.SHORTLISTED}
            </span>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-800">
              Int: {statusCounts.INTERVIEW}
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
              Offer: {statusCounts.OFFER}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Required Skill Coverage & Branch Split */}
      <div className="grid grid-cols-1 gap-4 pt-1 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Award className="h-3.5 w-3.5 text-indigo-600" />
            Required Skill Coverage Across Pool
          </div>
          <div className="space-y-2">
            {skillCoverage.map((item) => (
              <div key={item.skill} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.skill}</span>
                  <span className="font-semibold text-slate-600">
                    {item.matchedCount}/{total_candidates} ({item.pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 p-3.5">
          <div className="mb-2.5 text-xs font-bold text-slate-700">
            Branch Representation & Allowed Criteria
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(branchCounts) as BranchEnum[]).length === 0 ? (
              <span className="text-xs text-slate-400">No candidates in current scope</span>
            ) : (
              Object.entries(branchCounts).map(([branch, count]) => (
                <div
                  key={branch}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                >
                  <span className="font-bold text-slate-800">{branch}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Allowed Branches for <strong>{job.title}</strong>:{" "}
            <span className="font-semibold text-slate-700">
              {job.allowed_branches.join(", ")}
            </span>{" "}
            • Max Backlogs: <strong>{job.max_backlogs}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecruiterAnalyticsWidget;