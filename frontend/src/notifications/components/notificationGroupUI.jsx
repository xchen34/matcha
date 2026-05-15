import { Eye, Heart, HeartCrack, Zap } from "lucide-react"

/* ========== Icon ========== */
export function GroupTypeIcon({ type }) {
  if (type === "profile_view") {
    return <Eye className="h-5 w-5" aria-hidden="true" />;
  }

  if (type === "like_received") {
    return <Heart className="h-5 w-5" aria-hidden="true" />;
  }

  if (type === "unlike") {
    return <HeartCrack className="h-5 w-5" aria-hidden="true" />;
  }

  if (type === "match") {
    return <Zap className="h-5 w-5" aria-hidden="true" />;
  }

  return <Heart className="h-5 w-5" aria-hidden="true" />;
}

/*========== Accent ========== */
export function getGroupAccentClass(type) {
  if (type === "profile_view") {
    return "bg-blue-100 text-blue-700";
  }

  if (type === "like_received") {
    return "bg-pink-200 text-pink-700";
  }

  if (type === "unlike") {
    return "bg-slate-200 text-slate-700";
  }

  if (type === "match") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

/*========== Border ========== */
export function getGroupBorderClass(type) {
  if (type === "profile_view") {
    return "border-blue-200";
  }
  if (type === "like_received") {
    return "border-pink-200";
  }
  if (type === "unlike") {
    return "border-gray-200";
  }
  if (type === "match") {
    return "border-red-200";
  }

  return "border-slate-200";
}