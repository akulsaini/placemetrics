import React from "react";
import { NavLink } from "react-router-dom";
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  Database,
  Cpu,
  RefreshCw
} from "lucide-react";
import type { HealthOut } from "../types";

interface NavbarProps {
  health: HealthOut | null;
  isMock: boolean;
  onSeed: () => Promise<void>;
  seeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  isMock,
  onSeed,
  seeding
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <NavLink to="/student" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Placemetrics <span className="text-indigo-600">AI</span>
              </span>
              <p className="text-xs text-slate-500">
                Semantic Placement & Explainable ATS
              </p>
            </div>
          </NavLink>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <NavLink
              to="/student"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <GraduationCap className="h-4 w-4" />
              Student Portal
            </NavLink>
            <NavLink
              to="/recruiter"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <Briefcase className="h-4 w-4" />
              Recruiter ATS
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:flex">
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Engine:{" "}
              <strong className="text-slate-900">
                {health?.embedding_backend || "tfidf"}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isMock ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isMock ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {isMock ? "Local Mock Store" : "Live FastAPI"}
            </span>
          </div>

          <button
            type="button"
            onClick={onSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Reset / Seed Sample Campus Dataset"
          >
            {seeding ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
            ) : (
              <Database className="h-3.5 w-3.5 text-indigo-600" />
            )}
            Seed Demo Data
          </button>
        </div>
      </div>
    </header>
  );
};