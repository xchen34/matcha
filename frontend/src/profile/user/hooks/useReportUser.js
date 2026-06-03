import { useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

const MAX_FAKE_REPORT_REASON_LENGTH = 200;

export function useReportUser({ id, currentUser, reportFake, setModerationMessage }) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState("");

  /* ====== Reset form state when closing or after submission ====== */
  function reset() {
    setReportReason("");
    setError("");
  }

  /* ====== Handle report submission ====== */
  async function submitReport(event) {
    event?.preventDefault?.();

    const reason = reportReason.trim();

    // Validation 
    if (reason.length < 5) {
      return setError("Please provide a valid report reason (minimum 5 characters).");
    }

    if (reason.length > MAX_FAKE_REPORT_REASON_LENGTH) {
      return setError(
        `Report reason cannot exceed ${MAX_FAKE_REPORT_REASON_LENGTH} characters.`,
      );
    }

    setReporting(true);
    setError("");
    setModerationMessage?.("");

    try {
      const response = await fetch(`/api/users/${id}/report-fake`, 
        {
          method: "POST",
          headers: {
            ...buildApiHeaders(currentUser),
            "Content-Type": "application/json",
          },
        body: JSON.stringify({ reason }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return setError(payload.error || "Failed to submit report.");
      }

      reportFake?.(reason);

      setShowReportForm(false);
      reset();

      setModerationMessage?.(
        "This account has been reported successfully. Under review.",
      );
    } catch {
      setError("Network error while submitting report.");
    } finally {
      setReporting(false);
    }
  }

  /* ====== Handlers to open/close the report form ====== */
  function openReportForm() {
    setShowReportForm(true);
    setError("");
  }

  function closeReportForm() {
    setShowReportForm(false);
    reset();
  }

  return {
    // state
    showReportForm,
    reportReason,
    reporting,
    error,
    
    // actions
    submitReport,
    openReportForm,
    closeReportForm,

    // setters
    setReportReason,
  };
}