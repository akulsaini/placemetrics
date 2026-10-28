import React, { useEffect, useState, useCallback } from "react";
import {
  UserPlus,
  Upload,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  Award,
  Building2,
  MapPin,
  IndianRupee,
  AlertCircle,
  Layers
} from "lucide-react";
import type {
  ApplicationWithJobOut,
  
  BranchEnum,
  EvaluationOut,
  JobOut,
  StudentCreate,
  StudentOut
} from "../types";
import { BRANCHES } from '../types';
import { apiClient, extractErrorMessage } from "../api/client";
import { MatchBadge, StatusBadge } from "../components/MatchBadge";

interface StudentDashboardProps {
  onDataChange?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onDataChange }) => {
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "applications" | "profile">("feed");

  const [jobs, setJobs] = useState<JobOut[]>([]);
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationOut>>({});
  const [applications, setApplications] = useState<ApplicationWithJobOut[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showNewStudentModal, setShowNewStudentModal] = useState<boolean>(false);
  const [newStudentForm, setNewStudentForm] = useState<{
    name: string;
    email: string;
    branch: BranchEnum;
    cgpa: string;
    backlogs: string;
    graduation_year: string;
    skillsInput: string;
    resume_text: string;
  }>({
    name: "",
    email: "",
    branch: "CSE",
    cgpa: "8.5",
    backlogs: "0",
    graduation_year: "2026",
    skillsInput: "Python, React, TypeScript, SQL",
    resume_text: ""
  });

  const currentStudent = students.find((s) => s.id === selectedStudentId) || null;

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentList, jobList] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getJobs()
      ]);
      setStudents(studentList);
      setJobs(jobList);
      if (studentList.length > 0 && selectedStudentId === null) {
        setSelectedStudentId(studentList[0].id);
      }
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  const loadStudentSpecificData = useCallback(async (studentId: number, jobList: JobOut[]) => {
    try {
      const [apps, evalEntries] = await Promise.all([
        apiClient.getStudentApplications(studentId),
        Promise.all(
          jobList.map(async (job) => {
            const ev = await apiClient.evaluateJobForStudent(job.id, studentId);
            return [job.id, ev] as const;
          })
        )
      ]);
      setApplications(apps);
      const evalMap: Record<number, EvaluationOut> = {};
      evalEntries.forEach(([jId, ev]) => {
        evalMap[jId] = ev;
      });
      setEvaluations(evalMap);
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedStudentId !== null && jobs.length >= 0) {
      loadStudentSpecificData(selectedStudentId, jobs);
    }
  }, [selectedStudentId, jobs, loadStudentSpecificData]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    try {
      const payload: StudentCreate = {
        name: newStudentForm.name,
        email: newStudentForm.email,
        branch: newStudentForm.branch,
        cgpa: parseFloat(newStudentForm.cgpa),
        backlogs: parseInt(newStudentForm.backlogs, 10) || 0,
        graduation_year: parseInt(newStudentForm.graduation_year, 10) || 2026,
        skills: newStudentForm.skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        resume_text: newStudentForm.resume_text
      };
      const created = await apiClient.createStudent(payload);
      const refreshedStudents = await apiClient.getStudents();
      setStudents(refreshedStudents);
      setSelectedStudentId(created.id);
      setShowNewStudentModal(false);
      setBanner({
        type: "success",
        text: `Student profile for ${created.name} created and selected.`
      });
      onDataChange?.();
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStudent) return;
    setUploadingResume(true);
    setBanner(null);
    try {
      const res = await apiClient.uploadResume(currentStudent.id, file);
      setStudents((prev) =>
        prev.map((s) => (s.id === res.student.id ? res.student : s))
      );
      await loadStudentSpecificData(currentStudent.id, jobs);
      setBanner({
        type: "success",
        text: `Resume "${file.name}" parsed (${res.characters_extracted} chars). Extracted ${res.extracted_skills.length} skills.`
      });
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setUploadingResume(false);
      e.target.value = "";
    }
  };

  const handleApply = async (jobId: number) => {
    if (!currentStudent) return;
    setApplyingJobId(jobId);
    setBanner(null);
    try {
      await apiClient.createApplication({
        student_id: currentStudent.id,
        job_id: jobId
      });
      await loadStudentSpecificData(currentStudent.id, jobs);
      setBanner({
        type: "success",
        text: "Application submitted! Track real-time status under My Applications."
      });
      onDataChange?.();
    } catch (err) {
      setBanner({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setApplyingJobId(null);
    }
  };

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading student intelligence feed...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Student Switcher Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label
              htmlFor="student-switcher"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Active Student Profile
            </label>
            <select
              id="student-switcher"
              value={selectedStudentId ?? ""}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.branch} • {s.cgpa.toFixed(2)} CGPA)
                </option>
              ))}
            </select>
          </div>

          {currentStudent && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                {currentStudent.branch}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                CGPA: <strong>{currentStudent.cgpa.toFixed(2)}</strong>
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                Backlogs: <strong>{currentStudent.backlogs}</strong>
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                Skills: <strong>{currentStudent.skills.length}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentStudent && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
              <Upload className="h-4 w-4" />
              <span>{uploadingResume ? "Parsing Resume..." : "Upload Resume (PDF/TXT)"}</span>
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="hidden"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setShowNewStudentModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            New Student
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
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "feed"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Live AI Job Feed ({jobs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "applications"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          My Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          Student Profile & Resume
        </button>
      </div>

      {/* Tab 1: Job Feed with Live Match Scores */}
      {activeTab === "feed" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {jobs.map((job) => {
            const ev = evaluations[job.id];
            const isApplied = appliedJobIds.has(job.id);
            const isEligible = ev ? ev.eligibility.is_eligible : true;

            return (
              <div
                key={job.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                          {job.company}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {job.package_lpa} LPA
                        </span>
                      </div>
                    </div>
                    {ev && (
                      <MatchBadge
                        score={ev.score.overall_score}
                        band={ev.score.match_band}
                      />
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>

                  {/* Eligibility & Breakdown */}
                  {ev && (
                    <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          Eligibility Status:
                        </span>
                        {ev.eligibility.is_eligible ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Eligible ({job.min_cgpa}+ CGPA)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <XCircle className="h-4 w-4" />
                            Ineligible
                          </span>
                        )}
                      </div>

                      {!ev.eligibility.is_eligible && ev.eligibility.reasons.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-4 text-rose-600">
                          {ev.eligibility.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2.5 text-center">
                        <div>
                          <div className="text-[11px] text-slate-400">Semantic Fit</div>
                          <div className="font-bold text-slate-800">
                            {ev.score.semantic_score.toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">Required Skills</div>
                          <div className="font-bold text-slate-800">
                            {ev.score.required_skill_score.toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">CGPA Index</div>
                          <div className="font-bold text-slate-800">
                            {ev.score.cgpa_score.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {ev.score.matched_required_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                          {ev.score.missing_required_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800"
                            >
                              ✗ {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] italic text-slate-500">
                          {ev.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="text-xs text-slate-500">
                    Branches: <strong>{job.allowed_branches.join(", ")}</strong>
                  </div>

                  {isApplied ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!isEligible || applyingJobId === job.id}
                      onClick={() => handleApply(job.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {applyingJobId === job.id
                        ? "Submitting..."
                        : isEligible
                        ? "One-Click Apply"
                        : "Not Eligible"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: My Applications */}
      {activeTab === "applications" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {applications.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">
                No Applications Yet
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Explore the Live AI Job Feed to apply to matching roles.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Role & Company</th>
                  <th className="px-6 py-3.5">Package</th>
                  <th className="px-6 py-3.5">AI Match Score</th>
                  <th className="px-6 py-3.5">Stage / Status</th>
                  <th className="px-6 py-3.5">AI Evaluation Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{app.job.title}</div>
                      <div className="text-xs text-slate-500">
                        {app.job.company} • {app.job.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">
                      ₹{app.job.package_lpa} LPA
                    </td>
                    <td className="px-6 py-4">
                      <MatchBadge
                        score={app.overall_score}
                        band={app.match_band}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="max-w-md px-6 py-4 text-xs text-slate-600">
                      {app.evaluation.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Student Profile & Parsed Resume */}
      {activeTab === "profile" && currentStudent && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">
                {currentStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {currentStudent.name}
                </h3>
                <p className="text-xs text-slate-500">{currentStudent.email}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Branch</dt>
                <dd className="font-semibold text-slate-900">{currentStudent.branch}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">CGPA</dt>
                <dd className="font-semibold text-slate-900">
                  {currentStudent.cgpa.toFixed(2)} / 10.0
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Active Backlogs</dt>
                <dd className="font-semibold text-slate-900">{currentStudent.backlogs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Graduation Batch</dt>
                <dd className="font-semibold text-slate-900">
                  {currentStudent.graduation_year}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Resume File</dt>
                <dd className="font-medium text-indigo-600">
                  {currentStudent.resume_filename || "Manual Text Entry"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Award className="h-4 w-4 text-indigo-600" />
                Verified Technical Skills ({currentStudent.skills.length})
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentStudent.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-900">
                Extracted Resume Corpus (Used for Vector & TF-IDF Matching)
              </h4>
              <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-xs leading-relaxed text-slate-700">
                {currentStudent.resume_text || "No resume text uploaded yet."}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New Student */}
      {showNewStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Create Student Profile
            </h3>
            <form onSubmit={handleCreateStudent} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.name}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Ananya Gupta"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Campus Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStudentForm.email}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, email: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="ananya@campus.ac.in"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Branch *
                  </label>
                  <select
                    value={newStudentForm.branch}
                    onChange={(e) =>
                      setNewStudentForm({
                        ...newStudentForm,
                        branch: e.target.value as BranchEnum
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    CGPA *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={newStudentForm.cgpa}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, cgpa: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Backlogs
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={newStudentForm.backlogs}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, backlogs: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={newStudentForm.skillsInput}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, skillsInput: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Resume Summary / Projects Text
                </label>
                <textarea
                  rows={3}
                  value={newStudentForm.resume_text}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, resume_text: e.target.value })
                  }
                  placeholder="Paste key projects, internships, and tech stack..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStudentModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentDashboard;