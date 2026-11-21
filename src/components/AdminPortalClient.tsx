"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HardDrive,
  Mail,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import type { SerializedDataset } from "@/lib/serialize";

interface AdminPortalClientProps {
  initialDatasets: SerializedDataset[];
}

type TabKey = "pending" | "deletions" | "all";

export function AdminPortalClient({ initialDatasets }: AdminPortalClientProps) {
  const [datasets, setDatasets] = useState<SerializedDataset[]>(initialDatasets);
  const [tab, setTab] = useState<TabKey>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pendingDatasets = datasets.filter((d) => d.status === "PENDING");
  const deletionRequests = datasets.filter((d) => d.deletionRequested);
  const approvedCount = datasets.filter((d) => d.status === "APPROVED").length;

  async function handleReview(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/datasets/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to update dataset review status.",
        });
        return;
      }

      setDatasets((prev) =>
        prev.map((d) => (d.id === id ? data.dataset : d))
      );

      const emailNote =
        data.emailResult?.mode === "smtp"
          ? "Email notification sent via SMTP."
          : "Email notification logged (configure SMTP_* in .env for live delivery).";

      setFeedback({
        type: "success",
        message:
          action === "approve"
            ? `Dataset approved & published. ${emailNote}`
            : `Dataset rejected. ${emailNote}`,
      });
    } catch {
      setFeedback({ type: "error", message: "Network error while reviewing." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeletion(id: string, action: "approve" | "decline") {
    if (
      action === "approve" &&
      !window.confirm(
        "Permanently delete this dataset and all of its stored files? This cannot be undone."
      )
    ) {
      return;
    }

    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/datasets/${id}/deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to process deletion request.",
        });
        return;
      }

      if (action === "approve") {
        setDatasets((prev) => prev.filter((d) => d.id !== id));
      } else {
        setDatasets((prev) =>
          prev.map((d) => (d.id === id ? data.dataset : d))
        );
      }

      const emailNote =
        data.emailResult?.mode === "smtp"
          ? "User notified via SMTP."
          : "Notification logged to server console.";

      setFeedback({
        type: "success",
        message:
          action === "approve"
            ? `Dataset permanently deleted. ${emailNote}`
            : `Deletion request declined. ${emailNote}`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Network error while processing deletion request.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const visibleList =
    tab === "pending"
      ? pendingDatasets
      : tab === "deletions"
        ? deletionRequests
        : datasets;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {pendingDatasets.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Deletion Requests</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {deletionRequests.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Approved &amp; Published</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {approvedCount}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <Mail className="h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "pending"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Pending Review ({pendingDatasets.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("deletions")}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "deletions"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Deletion Requests ({deletionRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          All Datasets ({datasets.length})
        </button>
      </div>

      {/* Dataset List */}
      {visibleList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          {tab === "pending"
            ? "No datasets are currently waiting for review."
            : tab === "deletions"
              ? "No pending deletion requests."
              : "No datasets found in the repository."}
        </div>
      ) : (
        <div className="divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {visibleList.map((ds) => {
            const latest = ds.versions[0];
            const isBusy = busyId === ds.id;

            return (
              <div key={ds.id} className="p-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {ds.status === "PENDING" && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Pending Review
                        </span>
                      )}
                      {ds.status === "APPROVED" && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Approved
                        </span>
                      )}
                      {ds.status === "REJECTED" && (
                        <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                          Rejected
                        </span>
                      )}
                      {ds.deletionRequested && (
                        <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                          Deletion Requested
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        Submitted {formatDate(ds.createdAt)}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {ds.license}
                      </span>
                    </div>

                    <h2 className="text-base font-semibold text-slate-900">
                      <Link
                        href={`/datasets/${ds.slug}`}
                        className="inline-flex items-center gap-1.5 hover:text-indigo-700 hover:underline"
                      >
                        <span>{ds.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    </h2>

                    <p className="text-xs text-slate-600">
                      Submitter:{" "}
                      <span className="font-medium text-slate-900">
                        {ds.owner?.name ?? "Unknown"}
                      </span>
                      {ds.owner?.email && (
                        <span className="text-slate-500">
                          {" "}
                          ({ds.owner.email})
                        </span>
                      )}
                      {ds.owner?.institution && (
                        <span className="text-slate-500">
                          {" "}
                          · {ds.owner.institution}
                        </span>
                      )}
                    </p>

                    <p className="pt-1 text-sm text-slate-600">{ds.summary}</p>

                    {latest && (
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {latest.files.length}{" "}
                          {latest.files.length === 1 ? "file" : "files"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                          {formatBytes(latest.totalBytes)}
                        </span>
                        <Link
                          href={`/datasets/${ds.slug}`}
                          className="font-medium text-indigo-700 hover:underline"
                        >
                          Inspect &amp; Preview Files →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deletion Reason Callout */}
                {ds.deletionRequested && (
                  <div className="rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900">
                    <p className="font-semibold uppercase tracking-wider text-red-700">
                      Reason Stated for Deletion
                    </p>
                    <p className="mt-1 text-sm text-red-950">
                      {ds.deletionReason}
                    </p>
                  </div>
                )}

                {/* Action Bar */}
                {(ds.status !== "APPROVED" || ds.deletionRequested) && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      type="text"
                      value={notes[ds.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [ds.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional note to include in the email notification..."
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                    />

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {ds.deletionRequested ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeletion(ds.id, "decline")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Decline Request
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeletion(ds.id, "approve")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Approve &amp; Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleReview(ds.id, "reject")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleReview(ds.id, "approve")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve &amp; Publish
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
