import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/styles/UIClasses.jsx";

export default function ProfileActions({
  canAttemptSaveProfile,
  canSaveProfile,
  missingRequiredFields,
  onReload,
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={!canAttemptSaveProfile}
        >
          Save Profile
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onReload}>
          Reload Profile
        </button>
      </div>

      {!canSaveProfile && (
        <p className="text-xs text-amber-700">
          Save is locked. Required: {missingRequiredFields.join(", ") || "verified location"}.
          <br />
          <span className="text-xs text-slate-500">
            Fields marked with <span className="text-red-600">*</span> are required.
          </span>
        </p>
      )}
    </>
  );
}
