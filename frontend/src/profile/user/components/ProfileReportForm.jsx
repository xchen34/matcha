import { LoaderCircle } from "lucide-react";

function ProfileReportForm({ report }) {
  return (
    <form
      onSubmit={report.submitReport}
      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      {/* LABEL */}
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Reason for reporting
      </label>

      <textarea
        value={report.reportReason}
        onChange={(e) => report.setReportReason(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-dark focus:outline-none focus:ring-2 focus:ring-brand"
        rows={4}
        maxLength={200}
        placeholder="Explain why this profile looks fake"
      />

      {/* Error message */ }
      {report.error && (
        <p className="text-sm text-red-600">{report.error}</p>
      )}

      {/* BUTTONS */ }
      <div className="flex items-center gap-2">
        {/* Submit button */}
        <button
          type="submit"
          disabled={report.reporting}
          className="rounded-full bg-primary-dark px-4 py-2 text-xs font-semibold text-white"
        >
          {report.reporting ? (
            <span className="inline-flex items-center gap-1.5">
              <LoaderCircle
                size={14}
                className="animate-spin"
                aria-hidden="true"
              />
              Submitting...
            </span>
          ) : (
            "Submit report"
          )}
        </button>

        {/* Cancel button */}
        <button
          type="button"
          onClick={report.closeReportForm}
          className="rounded-full border px-4 py-2 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default ProfileReportForm;