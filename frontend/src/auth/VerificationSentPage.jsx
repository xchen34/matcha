import { Link, useLocation, useNavigate } from "react-router-dom";

export default function VerificationSentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail =
    typeof location.state?.prefillEmail === "string"
      ? location.state.prefillEmail.trim()
      : "";
  const previewUrl =
    typeof location.state?.previewUrl === "string"
      ? location.state.previewUrl
      : "";
  const devVerifyUrl =
    typeof location.state?.devVerifyUrl === "string"
      ? location.state.devVerifyUrl
      : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Verification Email Sent</h1>
        <p className="text-gray-600">
          Your account is created. Please verify your email before login.
        </p>

        {prefillEmail && (
          <p className="text-sm text-slate-700">
            Target email: <strong>{prefillEmail}</strong>
          </p>
        )}

        {(previewUrl || devVerifyUrl) && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {previewUrl && (
              <p>
                Ethereal preview:{" "}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-rose-600 underline"
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
                  className="font-semibold text-rose-600 underline"
                >
                  Verify directly in app
                </a>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              navigate("/resend-verification", {
                state: {
                  prefillEmail,
                  previewUrl,
                  devVerifyUrl,
                  from: "verification-sent",
                },
              })
            }
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition"
          >
            Resend verification
          </button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
