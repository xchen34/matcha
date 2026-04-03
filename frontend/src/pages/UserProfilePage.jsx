import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function UserProfilePage({ currentUser }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/profile/${id}`, {
          headers: buildApiHeaders(currentUser),
        });
        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error || "Failed to load profile");
          setLoading(false);
          return;
        }
        setData(payload);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    async function recordView() {
      if (!currentUser?.id || !id || String(currentUser.id) === String(id)) return;
      fetch(`/api/users/${id}/view`, {
        method: "POST",
        headers: buildApiHeaders(currentUser),
      }).catch(() => {});
    }

    if (id) {
      fetchProfile();
      recordView();
    }
  }, [id, currentUser]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading profile...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { user, profile } = data;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Profile
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {fullName || `@${user.username}`}
        </h2>
        <p className="text-sm text-slate-500">@{user.username}</p>
      </div>

      {Array.isArray(profile.photos) && profile.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.photos.map((photo) => (
            <div
              key={photo.id}
              className={`overflow-hidden rounded-xl border ${photo.is_primary ? "border-brand" : "border-slate-200"}`}
            >
              <img
                src={photo.data_url}
                alt="Profile"
                className="h-32 w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
        <div>
          <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Bio
          </span>
          <p className="mt-1 text-slate-800">{profile.biography || "-"}</p>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Gender
            </span>
            <p className="mt-1 text-slate-800">{profile.gender || "-"}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Sexual preference
            </span>
            <p className="mt-1 text-slate-800">{profile.sexual_preference || "-"}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Location
            </span>
            <p className="mt-1 text-slate-800">
              {profile.city || "-"} {profile.neighborhood ? `· ${profile.neighborhood}` : ""}
            </p>
          </div>
        </div>
      </div>

      {Array.isArray(profile.tags) && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-slate-900 text-white text-xs px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand/90 to-brand-deep p-5 text-white shadow-lg shadow-orange-200/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Fame rating
            </p>
            <p className="mt-2 text-sm text-white/85">Total likes received</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            Profile score
          </span>
        </div>
        <div className="mt-5 flex items-end gap-2">
          <span className="text-5xl font-bold leading-none">{profile.fame_rating ?? 0}</span>
          <span className="pb-1 text-sm font-medium text-white/80">likes</span>
        </div>
        <p className="mt-3 text-xs text-white/70">
          This reflects how many users have liked this profile.
        </p>
      </div>
    </section>
  );
}

export default UserProfilePage;
