const profileService = require("../../services/profileService");
const { isUserOnline } = require("../../services/presenceService");
const {
  resolveCurrentUserId,
  isProfileCompleted,
  getAge,
} = require("./helpers");

/* ========== Get my profile (private) ========== */
async function getMyProfile(req, res, next) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login again.",
      });
    }

    const { profileRow, tagsRows, photosRows } =
      await profileService.getMyProfile(currentUserId);

    if (!profileRow) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const profilePayload = {
      gender: profileRow.gender || "",
      sexual_preference: profileRow.sexual_preference || "",
      biography: profileRow.biography || "",
      birth_date: profileRow.birth_date,
      age: getAge(profileRow.birth_date),
      city: profileRow.city || "",
      neighborhood: profileRow.neighborhood || "",
      gps_consent: Boolean(profileRow.gps_consent),
      latitude: profileRow.latitude,
      longitude: profileRow.longitude,
      tags: tagsRows.map((entry) => entry.name),
      fame_rating: profileRow.fame_rating ?? 0,
      photos: photosRows.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };

    return res.json({
      user: {
        id: profileRow.user_id,
        email: profileRow.email,
        username: profileRow.username,
        first_name: profileRow.first_name,
        last_name: profileRow.last_name,
        email_verified: profileRow.email_verified,
        profile_completed: isProfileCompleted(
          {
            username: profileRow.username,
            first_name: profileRow.first_name,
            last_name: profileRow.last_name,
            email: profileRow.email,
          },
          profilePayload,
        ),
        created_at: profileRow.created_at,
      },
      profile: profilePayload,
    });
  } catch (error) {
    return next(error);
  }
}

/* ========== Get public profile by id (other users) ========== */
async function getPublicProfile(req, res, next) {
  try {
    const requestedId = Number(req.params.id);
    if (!Number.isInteger(requestedId) || requestedId <= 0) {
      return res.status(400).json({
        error: "Invalid user id",
      });
    }

    const currentUserId = Number(req.userId);
    const { profileRow, tagsRows, photosRows, relationRow } =
      await profileService.getPublicProfile(requestedId, currentUserId);

    if (!profileRow) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const relation = relationRow || {
      i_liked: false,
      liked_me: false,
      reported_fake_by_me: false,
      blocked_by_you: false,
      blocked_you: false,
    };
    const iLiked = Boolean(relation.i_liked);
    const likedMe = Boolean(relation.liked_me);

    return res.json({
      user: {
        id: profileRow.user_id,
        username: profileRow.username,
        first_name: profileRow.first_name,
        last_name: profileRow.last_name,
        is_online: isUserOnline(profileRow.user_id),
        last_seen_at: profileRow.last_seen_at,
      },
      profile: {
        gender: profileRow.gender || "",
        sexual_preference: profileRow.sexual_preference || "",
        biography: profileRow.biography || "",
        birth_date: profileRow.birth_date,
        age: getAge(profileRow.birth_date),
        city: profileRow.city || "",
        neighborhood: profileRow.neighborhood || "",
        fame_rating: profileRow.fame_rating ?? 0,
        tags: tagsRows.map((entry) => entry.name),
        photos: photosRows.map((item) => ({
          id: item.id,
          data_url: item.data_url,
          is_primary: item.is_primary,
        })),
      },
      relation: {
        i_liked: iLiked,
        liked_me: likedMe,
        is_match: iLiked && likedMe,
        reported_fake_by_me: Boolean(relation.reported_fake_by_me),
        blocked_by_you: Boolean(relation.blocked_by_you),
        blocked_you: Boolean(relation.blocked_you),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMyProfile, getPublicProfile };
