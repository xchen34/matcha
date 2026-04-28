const pool = require("../../db");
const { isUserOnline } = require("../../realtime/presence");
const { resolveCurrentUserId, isProfileCompleted, getAge } = require("../../routes/profileHelpers");

async function getMyProfile(req, res, next) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const [profileResult, tagsResult, photosResult] = await Promise.all([
      pool.query(
        `
        SELECT
          u.id AS user_id,
          u.email,
          u.username,
          u.first_name,
          u.last_name,
          u.email_verified,
          u.created_at,
          p.gender,
          p.sexual_preference,
          p.biography,
          p.birth_date,
          p.city,
          p.neighborhood,
          p.gps_consent,
          p.latitude,
          p.longitude,
          GREATEST(
              LEAST(
                FLOOR(
                  COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20
                ) + FLOOR(
                  COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5
                ) + CASE
                  WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0
                    THEN -1
                  ELSE 0
                END,
                100
              ),
              0
            )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
        `,
        [currentUserId],
      ),
      pool.query(
        `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
        [currentUserId],
      ),
      pool.query(
        `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
        [currentUserId],
      ),
    ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = profileResult.rows[0];
    const profilePayload = {
      gender: row.gender || "",
      sexual_preference: row.sexual_preference || "",
      biography: row.biography || "",
      birth_date: row.birth_date,
      age: getAge(row.birth_date),
      city: row.city || "",
      neighborhood: row.neighborhood || "",
      gps_consent: Boolean(row.gps_consent),
      latitude: row.latitude,
      longitude: row.longitude,
      tags: tagsResult.rows.map((entry) => entry.name),
      fame_rating: row.fame_rating ?? 0,
      photos: photosResult.rows.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };

    return res.json({
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        email_verified: row.email_verified,
        profile_completed: isProfileCompleted(
          {
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
          },
          profilePayload,
        ),
        created_at: row.created_at,
      },
      profile: profilePayload,
    });
  } catch (error) {
    return next(error);
  }
}

async function getPublicProfile(req, res, next) {
  try {
    const requestedId = Number(req.params.id);
    if (!Number.isInteger(requestedId) || requestedId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const currentUserId = Number(req.header("x-user-id"));
    const [profileResult, tagsResult, photosResult, relationResult] = await Promise.all([
      pool.query(
        `
        SELECT
          u.id AS user_id,
          u.username,
          u.first_name,
          u.last_name,
          u.last_seen_at,
          p.gender,
          p.sexual_preference,
          p.biography,
          p.birth_date,
          p.city,
          p.neighborhood,
          GREATEST(
              LEAST(
                FLOOR(
                  COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20
                ) + FLOOR(
                  COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5
                ) + CASE
                  WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0
                    THEN -1
                  ELSE 0
                END,
                100
              ),
              0
            )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
        `,
        [requestedId],
      ),
      pool.query(
        `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
        [requestedId],
      ),
      pool.query(
        `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
        [requestedId],
      ),
      currentUserId
        ? pool.query(
            `
            SELECT
              EXISTS(
                SELECT 1
                FROM likes
                WHERE liker_user_id = $1 AND liked_user_id = $2
              ) AS i_liked,
              EXISTS(
                SELECT 1
                FROM likes
                WHERE liker_user_id = $2 AND liked_user_id = $1
              ) AS liked_me,
              EXISTS(
                SELECT 1
                FROM fake_account_reports
                WHERE reporter_user_id = $1
                  AND reported_user_id = $2
              ) AS reported_fake_by_me,
              EXISTS(
                SELECT 1
                FROM user_blocks
                WHERE blocker_user_id = $1
                  AND blocked_user_id = $2
              ) AS blocked_by_you,
              EXISTS(
                SELECT 1
                FROM user_blocks
                WHERE blocker_user_id = $2
                  AND blocked_user_id = $1
              ) AS blocked_you
            `,
            [currentUserId, requestedId],
          )
        : Promise.resolve({
            rows: [
              {
                i_liked: false,
                liked_me: false,
                reported_fake_by_me: false,
                blocked_by_you: false,
                blocked_you: false,
              },
            ],
          }),
    ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = profileResult.rows[0];
    const relation = relationResult.rows[0] || {
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
        id: row.user_id,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        is_online: isUserOnline(row.user_id),
        last_seen_at: row.last_seen_at,
      },
      profile: {
        gender: row.gender || "",
        sexual_preference: row.sexual_preference || "",
        biography: row.biography || "",
        birth_date: row.birth_date,
        age: getAge(row.birth_date),
        city: row.city || "",
        neighborhood: row.neighborhood || "",
        fame_rating: row.fame_rating ?? 0,
        tags: tagsResult.rows.map((entry) => entry.name),
        photos: photosResult.rows.map((item) => ({
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