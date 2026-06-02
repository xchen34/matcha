import {
  ImageIcon,
  ShieldAlert,
  Ban,
  TriangleAlert,
} from "lucide-react";

function AlertBox({ icon: Icon, children, variant = "default" }) {
  const variants = {
    default:
      "border-primary/30 bg-primary-light text-primary-dark",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800",
    danger:
      "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${variants[variant]}`}
    >
      <Icon size={16} className="shrink-0" />

      <p className="text-sm leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function ProfileAlerts({
  canLikeProfiles,
  hasProfilePhoto,
  moderationMessage,
  reportedFake,
  blockedUser,
}) {
  return (
    <div className="space-y-2">
      {!canLikeProfiles && (
        <AlertBox
          icon={ImageIcon}
          variant="warning"
        >
          You must add a primary profile photo
          to enable likes.
        </AlertBox>
      )}

      {!hasProfilePhoto && (
        <AlertBox
          icon={ImageIcon}
          variant="warning"
        >
          This user has no profile photo —
          you cannot like them.
        </AlertBox>
      )}

      {moderationMessage && (
        <AlertBox
          icon={TriangleAlert}
          variant="danger"
        >
          {moderationMessage}
        </AlertBox>
      )}

      {reportedFake && (
        <AlertBox
          icon={ShieldAlert}
          variant="danger"
        >
          You already reported this user
          as fake account.
        </AlertBox>
      )}

      {blockedUser && (
        <AlertBox
          icon={Ban}
          variant="danger"
        >
          You already blocked this user.
        </AlertBox>
      )}
    </div>
  );
}

export default ProfileAlerts;
