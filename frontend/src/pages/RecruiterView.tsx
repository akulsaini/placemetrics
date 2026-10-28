import React, { useEffect, useState, useCallback } from "react";
import {
  PlusCircle,
  Users,
  CheckSquare,
  Filter,
  Building2,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import RecruiterAnalyticsWidget from "../plugins/RecruiterAnalyticsWidget";
import type {
  
  BranchEnum,
  BulkTargetStatus,
  CandidateScope,
  CandidatesOut,
  JobCreate,
  JobOut
} from "../types";
import { 
  BRANCHES, 
  BULK_TARGET_STATUSES 
} from "../types";
import { apiClient, extractErrorMessage } from "../api/client";
import { MatchBadge, StatusBadge } from "../components/MatchBadge";

interface RecruiterDashboardProps {
  onDataChange?: () => void;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({ onDataChange }) => {
  const [jobs, setJobs] = useState<JobOut[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [scope, setScope] = useState<CandidateScope>("applicants");
  const [candidatesData, setCandidatesData] = useState<CandidatesOut | null>(null);

  const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<BulkTargetStatus>("SHORTLISTED");
  const [updatingBulk, setUpdatingBulk] = useState<boolean>(false);

  const [showCreateJobModal, setShowCreateJobModal] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [jobForm, setJobForm] = useState<{
    title: string;
    company: string;
    location: string;
    package_lpa: string;
    min_cgpa: string;
    max_backlogs: string;
    allowed_branches: BranchEnum[];
    required_skills: string;
    preferred_skills: string;
    description: string;
  }>({
    title: "",
    company: "",
    location: "Bengaluru",
    package_lpa: "18.0",
    min_cgpa: "7.5",
    max_backlogs: "0",
    allowed_branches: ["CSE", "IT", "ECE"],
    required_branches_dummy: "",
    required_skills: "Python, React, FastAPI, SQL",
    preferred_skills: "Docker, AWS, TypeScript",
    description: ""
  } as {
    title: string;
    company: string;
    location: string;
    package_lpa: string;
    min_cgpa: string;
    max_backlogs: string;
    allowed_branches: BranchEnum[];
    required_skills: string;
    preferred_skills: string;
    description: string;
  });

  const loadJobs = useCallback(async () => {
    try {
      const list = await apiClient.getJobs();
      setJobs(list);
      if (list.length > 0 && selectedJobId === null) {
        setSelectedJobId(list[0].id);
      }
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    }
  }, [selectedJobId]);

  const loadCandidates = useCallback(async (jobId: number, currentScope: CandidateScope) => {
    try {
      const data = await apiClient.getJobCandidates(jobId, currentScope);
      setCandidatesData(data);
      setSelectedAppIds([]);
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId !== null) {
      loadCandidates(selectedJobId, scope);
    }
  }, [selectedJobId, scope, loadCandidates]);

  const toggleBranchInForm = (branch: BranchEnum) => {
    setJobForm((prev) => {
      const exists = prev.allowed_branches.includes(branch);
      const next = exists
        ? prev.allowed_branches.filter((b) => b !== branch)
        : [...prev.allowed_branches, branch];
      return { ...prev, allowed_branches: next.length > 0 ? next : [branch] };
    });
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    try {
      const payload: JobCreate = {
        title: jobForm.title,
        company: jobForm.company,
        location: jobForm.location,
        package_lpa: parseFloat(jobForm.package_lpa) || 12,
        min_cgpa: parseFloat(jobForm.min_cgpa) || 6.5,
        max_backlogs: parseInt(jobForm.max_backlogs, 10) || 0,
        allowed_branches: jobForm.allowed_branches,
        required_skills: jobForm.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferred_skills: jobForm.preferred_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description: jobForm.description
      };
      const created = await apiClient.createJob(payload);
      const updatedJobs = await apiClient.getJobs();
      setJobs(updatedJobs);
      setSelectedJobId(created.id);
      setShowCreateJobModal(false);
      setBanner({
        type: "success",
        text: `Job requisition "${created.title}" published.`
      });
      onDataChange?.();
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    }
  };

  const handleToggleSelectApp = (appId: number) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const selectableApplicationIds =
    candidatesData?.candidates
      .map((c) => c.application?.id)
      .filter((id): id is number => typeof id === "number") || [];

  const handleSelectAllApps = () => {
    if (selectedAppIds.length === selectableApplicationIds.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(selectableApplicationIds);
    }
  };

  const handleBulkAction = async () => {
    if (selectedAppIds.length === 0 || selectedJobId === null) return;
    setUpdatingBulk(true);
    setBanner(null);
    try {
      const res = await apiClient.bulkUpdateApplicationStatus({
        application_ids: selectedAppIds,
        target_status: bulkStatus
      });
      await loadCandidates(selectedJobId, scope);
      setBanner({
        type: "success",
        text: `Updated ${res.updated_count} candidate application(s) to ${bulkStatus}.`
      });
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setUpdatingBulk(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Job Selector */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label
              htmlFor="job-selector"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Active Job Requisition
            </label>
            <select
              id="job-selector"
              value={selectedJobId ?? ""}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company} (₹{j.package_lpa} LPA)
                </option>
              ))}
            </select>
          </div>

          {candidatesData && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                {candidatesData.job.company}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                <IndianRupee className="h-3.5 w-3.5" />
                {candidatesData.job.package_lpa} LPA
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                Min CGPA: <strong>{candidatesData.job.min_cgpa}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setScope("applicants")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scope === "applicants"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Applied Candidates
            </button>
            <button
              type="button"
              onClick={() => setScope("all_students")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scope === "all_students"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Talent Discovery (All Students)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateJobModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            Post New Job
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plug-in Analytics Widget */}
      {candidatesData && (
        <RecruiterAnalyticsWidget candidatesData={candidatesData} />
      )}

      {/* Bulk Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <Users className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold text-slate-900">
            Ranked Candidates ({candidatesData?.total_candidates || 0})
          </span>
          <span className="text-xs text-slate-500">
            • Eligible: <strong>{candidatesData?.eligible_count || 0}</strong> • Strong
            Matches: <strong>{candidatesData?.strong_match_count || 0}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500">
            Selected: <strong>{selectedAppIds.length}</strong>
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as BulkTargetStatus)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            {BULK_TARGET_STATUSES.map((st) => (
              <option key={st} value={st}>
                Move to {st}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={selectedAppIds.length === 0 || updatingBulk}
            onClick={handleBulkAction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {updatingBulk ? "Updating..." : "Apply Bulk Status"}
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!candidatesData || candidatesData.candidates.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              No Candidates in Current View
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Switch to &ldquo;Talent Discovery (All Students)&rdquo; to evaluate the entire campus pool.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={
                      selectableApplicationIds.length > 0 &&
                      selectedAppIds.length === selectableApplicationIds.length
                    }
                    onChange={handleSelectAllApps}
                    disabled={selectableApplicationIds.length === 0}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                </th>
                <th className="px-4 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Academics</th>
                <th className="px-4 py-3.5">Eligibility</th>
                <th className="px-4 py-3.5">AI Match Score</th>
                <th className="px-4 py-3.5">Skill Breakdown</th>
                <th className="px-4 py-3.5">Application Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidatesData.candidates.map(({ student, evaluation, application }) => {
                const isSelected = application
                  ? selectedAppIds.includes(application.id)
                  : false;

                return (
                  <tr
                    key={student.id}
                    className={`transition hover:bg-slate-50/80 ${
                      isSelected ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      {application ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectApp(application.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                      ) : (
                        <span
                          className="text-xs text-slate-300"
                          title="Student has not submitted an application yet"
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.email}</div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="font-semibold text-slate-800">{student.branch}</span>
                      <div className="text-slate-500">
                        {student.cgpa.toFixed(2)} CGPA • {student.backlogs} Backlogs
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {evaluation.eligibility.is_eligible ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Eligible
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                            <XCircle className="h-4 w-4" />
                            Ineligible
                          </span>
                          <p className="mt-0.5 text-[11px] text-rose-500">
                            {evaluation.eligibility.reasons[0]}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <MatchBadge
                        score={evaluation.score.overall_score}
                        band={evaluation.score.match_band}
                      />
                      <div className="mt-1 text-[11px] text-slate-400">
                        Sem: {evaluation.score.semantic_score.toFixed(0)}% | Req:{" "}
                        {evaluation.score.required_skill_score.toFixed(0)}%
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {evaluation.score.matched_required_skills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
                          >
                            ✓ {s}
                          </span>
                        ))}
                        {evaluation.score.missing_required_skills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700"
                          >
                            ✗ {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {application ? (
                        <StatusBadge status={application.status} />
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Not Applied
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Create Job */}
      {showCreateJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Post New Campus Job Requisition
            </h3>
            <form onSubmit={handleCreateJob} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Machine Learning Engineer"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.company}
                    onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                    placeholder="e.g. Rubrik"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    CTC (LPA) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={jobForm.package_lpa}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, package_lpa: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Min CGPA
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={jobForm.min_cgpa}
                    onChange={(e) => setJobForm({ ...jobForm, min_cgpa: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Max Backlogs
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={jobForm.max_backlogs}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, max_backlogs: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Eligible Branches
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {BRANCHES.map((branch) => {
                    const active = jobForm.allowed_branches.includes(branch);
                    return (
                      <button
                        type="button"
                        key={branch}
                        onClick={() => toggleBranchInForm(branch)}
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {branch}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Required Skills (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={jobForm.required_skills}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, required_skills: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Preferred Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={jobForm.preferred_skills}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, preferred_skills: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Role Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={jobForm.description}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, description: e.target.value })
                  }
                  placeholder="Describe technical responsibilities, architecture, and expectations..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Publish Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RecruiterDashboard;