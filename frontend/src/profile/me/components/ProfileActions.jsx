import { primaryButtonClass, secondaryButtonClass } from "@/styles/UIClasses.jsx";
import { Save, RotateCcw } from "lucide-react";

export default function ProfileActions({
  canAttemptSaveProfile,
  canSaveProfile,
  missingRequiredFields,
  onReload,
}) {
  return (
    <>
      {/* ACTION BUTTONS */}
      <div className="flex items-center gap-3">
        {/* Save profile button */}
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={!canAttemptSaveProfile}
        >
          <Save size={15} aria-hidden="true" className="mr-1" />
          Save profile
        </button>

        {/* Reload profile button */}
        <button type="button" className={secondaryButtonClass} onClick={onReload}>
          <RotateCcw size={15} aria-hidden="true" className="mr-1" />
          Reload profile
        </button>
      </div>

      {/* Save lock warning message */}
      {!canSaveProfile && (
        <p className="text-xs text-primary-dark">
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
