import { previewBoxClass } from "@/styles/UIClasses.jsx";

export default function EmailPreviewLinks({ previewUrl = "", devVerifyUrl = "", className = "" }) {
  if (!previewUrl && !devVerifyUrl) return null;

  return (
    <div className={`${previewBoxClass} ${className}`}>
      {previewUrl && (
        <p>
          Email preview:{" "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary-dark underline"
          >
            Open verification email
          </a>
        </p>
      )}

      {devVerifyUrl && (
        <p>
          Fallback verify link:{" "}
          <a
            href={devVerifyUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary-dark underline"
          >
            Verify directly in app
          </a>
        </p>
      )}
    </div>
  );
}
