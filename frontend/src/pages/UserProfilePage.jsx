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

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span>Fame rating</span>
          <span className="font-semibold text-slate-900">{profile.fame_rating ?? 0}</span>
        </div>
      </div>
    </section>
  );
}

export default UserProfilePage;
