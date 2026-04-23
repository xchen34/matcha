const express = require("express");
const pool = require("../db");
const { createNotification } = require("./notificationsService");
const { insertSystemMessage } = require("../utils/chatSystemMessage");
const { isUserOnline } = require("../realtime/presence");

const router = express.Router();

function normalizeTag(tag) {
  if (typeof tag !== "string") return "";
  let normalized = tag.trim().toLowerCase();
  if (!normalized) return "";
  if (!normalized.startsWith("#")) normalized = `#${normalized}`;
  if (!/^#[a-z0-9_]{1,30}$/.test(normalized)) return "";
  return normalized;
}

function parseTagsQueryParam(rawTags) {
  if (rawTags === undefined || rawTags === null || rawTags === "") {
    return null;
  }

  const values = Array.isArray(rawTags)
    ? rawTags
    : String(rawTags)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const unique = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = normalizeTag(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique.length > 0 ? unique : null;
}

async function userHasPrimaryPhoto(userId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM user_photos
    WHERE user_id = $1
      AND is_primary = TRUE
    LIMIT 1
    `,
    [userId],
  );
  return result.rowCount > 0;
}

// GET /api/profile/likes — users who liked the current user
router.get("/profile/likes", async (req, res, next) => {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const result = await pool.query(
      `
      SELECT id, username, email, primary_photo_url, created_at
      FROM (
        SELECT DISTINCT ON (u.id)
          u.id,
          u.username,
          u.email,
          up.primary_photo_url,
          l.created_at
        FROM likes l
        JOIN users u ON u.id = l.liker_user_id
        LEFT JOIN LATERAL (
          SELECT data_url AS primary_photo_url
          FROM user_photos
          WHERE user_id = u.id
            AND is_primary = TRUE
          ORDER BY id DESC
          LIMIT 1
        ) up ON TRUE
        WHERE l.liked_user_id = $1
        ORDER BY u.id, l.created_at DESC
      ) latest_likes_per_user
      ORDER BY created_at DESC, id DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        primary_photo_url: row.primary_photo_url || null,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/profile/views — users who viewed the current user
router.get("/profile/views", async (req, res, next) => {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const result = await pool.query(
      `
      SELECT id, username, email, primary_photo_url, created_at
      FROM (
        SELECT DISTINCT ON (u.id)
          u.id,
          u.username,
          u.email,
          up.primary_photo_url,
          v.created_at
        FROM profile_views v
        JOIN users u ON u.id = v.viewer_user_id
        LEFT JOIN LATERAL (
          SELECT data_url AS primary_photo_url
          FROM user_photos
          WHERE user_id = u.id
            AND is_primary = TRUE
          ORDER BY id DESC
          LIMIT 1
        ) up ON TRUE
        WHERE v.viewed_user_id = $1
        ORDER BY u.id, v.created_at DESC
      ) latest_views_per_user
      ORDER BY created_at DESC, id DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        primary_photo_url: row.primary_photo_url || null,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/profile/matches — users who are mutual matches with the current user
router.get("/profile/matches", async (req, res, next) => {
  try {
    const currentUserId = req.header("x-user-id");
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        up.primary_photo_url,
        GREATEST(l_out.created_at, l_in.created_at) AS matched_at
      FROM users u
      JOIN likes l_out
        ON l_out.liker_user_id = $1
       AND l_out.liked_user_id = u.id
      JOIN likes l_in
        ON l_in.liker_user_id = u.id
       AND l_in.liked_user_id = $1
      LEFT JOIN LATERAL (
        SELECT data_url AS primary_photo_url
        FROM user_photos
        WHERE user_id = u.id
          AND is_primary = TRUE
        ORDER BY id DESC
        LIMIT 1
      ) up ON TRUE
      WHERE EXISTS (
        SELECT 1
        FROM likes a
        JOIN likes b
          ON b.liker_user_id = a.liked_user_id
         AND b.liked_user_id = a.liker_user_id
        WHERE a.liker_user_id = $1
          AND a.liked_user_id = u.id
      )
      ORDER BY matched_at DESC
      `,
      [currentUserId],
    );

    return res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        primary_photo_url: row.primary_photo_url || null,
        matched_at: row.matched_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/users/:id/view — record that the current user viewed user :id
router.post("/users/:id/view", async (req, res, next) => {
  try {
    const rawViewerUserId = req.header("x-user-id");
    const rawViewedUserId = req.params.id;
    const viewer_user_id = Number(rawViewerUserId);
    const viewed_user_id = Number(rawViewedUserId);

    if (!rawViewerUserId || !rawViewedUserId) {
      return res.status(400).json({
        error: "viewer_user_id (header) et viewed_user_id (param) requis",
      });
    }

    if (
      !Number.isInteger(viewer_user_id) ||
      viewer_user_id <= 0 ||
      !Number.isInteger(viewed_user_id) ||
      viewed_user_id <= 0
    ) {
      return res.status(400).json({
        error: "viewer_user_id et viewed_user_id doivent etre des entiers positifs",
      });
    }

    if (String(viewer_user_id) === String(viewed_user_id)) {
      return res.status(400).json({ error: "Impossible to view myself" });
    }

    const usersExistenceResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = ANY($1::int[])
      `,
      [[viewer_user_id, viewed_user_id]],
    );
    const existingUserIds = new Set(
      usersExistenceResult.rows.map((row) => Number(row.id)),
    );

    if (!existingUserIds.has(viewer_user_id)) {
      return res.status(401).json({ error: "Viewer user not found" });
    }

    if (!existingUserIds.has(viewed_user_id)) {
      return res.status(404).json({ error: "Viewed user not found" });
    }

    const result = await pool.query(
      `
      INSERT INTO profile_views (viewer_user_id, viewed_user_id)
      VALUES ($1, $2)
      ON CONFLICT (viewer_user_id, viewed_user_id)
      DO UPDATE SET created_at = NOW()
      RETURNING viewer_user_id, viewed_user_id, created_at
      `,
      [viewer_user_id, viewed_user_id],
    );

    if (result.rowCount > 0) {
      await createNotification({
        userId: viewed_user_id,
        actorUserId: viewer_user_id,
        type: "profile_view",
        message: "Your profile was viewed.",
        metadata: { viewer_user_id },
      });
    }

    return res.status(201).json({
      message: "View recorded",
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/users/:id/like — check if current user likes user :id
router.get("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    const sql = `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    res.json({ liked: result.rowCount > 0 });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches — intelligent suggestions based on preference, proximity, shared tags and fame
router.get("/matches", async (req, res, next) => {
  try {
    const userId = req.header("x-user-id");
    const {
      min_age,
      max_age,
      min_fame,
      max_fame,
      username,
      city,
      tags,
      sort_by,
      sort_dir,
    } = req.query;
    const parsedLimit = Number(req.query.limit);
    const parsedOffset = Number(req.query.offset);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;
    const offset = Number.isFinite(parsedOffset)
      ? Math.max(parsedOffset, 0)
      : 0;

    function parseOptionalNumber(value) {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return null;
      }

      return parsed;
    }

    const parsedMinAge = parseOptionalNumber(min_age);
    const parsedMaxAge = parseOptionalNumber(max_age);
    const minAge =
      parsedMinAge === null ? null : Math.min(Math.max(parsedMinAge, 18), 150);
    const maxAge =
      parsedMaxAge === null ? null : Math.min(Math.max(parsedMaxAge, 18), 150);
    const parsedMinFame = parseOptionalNumber(min_fame);
    const parsedMaxFame = parseOptionalNumber(max_fame);
    const minFame =
      parsedMinFame === null ? null : Math.min(Math.max(parsedMinFame, 0), 100);
    const maxFame =
      parsedMaxFame === null ? null : Math.min(Math.max(parsedMaxFame, 0), 100);
    const cityFilter =
      typeof city === "string" && city.trim().length > 0 ? city.trim() : null;
    const tagsFilter = parseTagsQueryParam(tags);
    const usernameFilter =
      typeof username === "string" && username.trim().length > 0
        ? username.trim()
        : null;

    const normalizedSortBy =
      typeof sort_by === "string" ? sort_by.trim().toLowerCase() : "";
    const normalizedSortDir =
      String(sort_dir || "desc")
        .trim()
        .toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    let orderBySql = `
      (me.city IS NOT NULL AND p.city IS NOT NULL AND p.city = me.city) DESC,
      common_tags_count DESC,
      fame_rating DESC NULLS LAST,
      u.id ASC
    `;

    if (normalizedSortBy === "age") {
      orderBySql = `
        age_value ${normalizedSortDir} NULLS LAST,
        u.id ASC
      `;
    } else if (normalizedSortBy === "location") {
      orderBySql = `
        p.city ${normalizedSortDir} NULLS LAST,
        p.neighborhood ${normalizedSortDir} NULLS LAST,
        u.id ASC
      `;
    } else if (
      normalizedSortBy === "fame" ||
      normalizedSortBy === "fame_rating"
    ) {
      orderBySql = `
        fame_rating ${normalizedSortDir} NULLS LAST,
        u.id ASC
      `;
    } else if (normalizedSortBy === "tags") {
      orderBySql = `
        common_tags_count ${normalizedSortDir} NULLS LAST,
        fame_rating DESC NULLS LAST,
        u.id ASC
      `;
    }

    if (!userId) {
      return res.status(400).json({ error: "x-user-id header requis" });
    }

    // Retrieve likes to determine liked and is_match status
    const likesGivenRes = await pool.query(
      `SELECT liked_user_id FROM likes WHERE liker_user_id = $1`,
      [userId],
    );
    const likesReceivedRes = await pool.query(
      `SELECT liker_user_id FROM likes WHERE liked_user_id = $1`,
      [userId],
    );
    const likesGiven = new Set(
      likesGivenRes.rows.map((r) => String(r.liked_user_id)),
    );
    const likesReceived = new Set(
      likesReceivedRes.rows.map((r) => String(r.liker_user_id)),
    );

    const sql = `
      WITH me AS (
        SELECT
          city,
          gender,
          sexual_preference
        FROM profiles
        WHERE user_id = $1
      ),
      me_tags AS (
        SELECT tag_id
        FROM user_profile_tags
        WHERE user_id = $1
      ),
      user_fame AS (
        SELECT
          u.id,
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
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
      )
      SELECT
        u.id,
        u.username,
        u.email,
        u.last_seen_at,
        p.gender,
        p.sexual_preference,
        p.city,
        p.neighborhood,
        uf.fame_rating,
        p.birth_date,
        ph.primary_photo_url,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date))::int AS age_value,
        COUNT(DISTINCT t.id)::int AS tags_count,
        COUNT(DISTINCT mt.tag_id)::int AS common_tags_count,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT t.name), NULL),
          ARRAY[]::varchar[]
        ) AS tags
      FROM users u
      LEFT JOIN user_fame uf ON uf.id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT up.data_url AS primary_photo_url
        FROM user_photos up
        WHERE up.user_id = u.id
        ORDER BY up.is_primary DESC, up.id ASC
        LIMIT 1
      ) ph ON TRUE
      LEFT JOIN user_profile_tags upt ON upt.user_id = u.id
      LEFT JOIN tags t ON t.id = upt.tag_id
      LEFT JOIN me_tags mt ON mt.tag_id = t.id
      LEFT JOIN me ON TRUE
      WHERE u.id <> $1
        AND p.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM fake_account_reports far
          WHERE far.reporter_user_id = $1
            AND far.reported_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (ub.blocker_user_id = $1 AND ub.blocked_user_id = u.id)
             OR (ub.blocker_user_id = u.id AND ub.blocked_user_id = $1)
        )
        AND (
          $2::int IS NULL
          OR (p.birth_date IS NOT NULL AND p.birth_date <= CURRENT_DATE - ($2::text || ' years')::interval)
        ) -- 至少 min_age
        AND (
          $3::int IS NULL
          OR (p.birth_date IS NOT NULL AND p.birth_date >= CURRENT_DATE - ($3::text || ' years')::interval)
        ) -- 至多 max_age
        AND (
          $4::numeric IS NULL OR uf.fame_rating >= $4::numeric
        )
        AND (
          $5::numeric IS NULL OR uf.fame_rating <= $5::numeric
        )
        AND (
          $6::text IS NULL OR u.username ILIKE ('%' || $6::text || '%')
        )
        AND (
          $7::text[] IS NULL
          OR EXISTS (
            SELECT 1
            FROM user_profile_tags uptf
            JOIN tags tf ON tf.id = uptf.tag_id
            WHERE uptf.user_id = u.id
              AND tf.name = ANY($7::text[])
          )
        )
        AND (
          $8::text IS NULL
          OR (p.city IS NOT NULL AND LOWER(p.city) = LOWER($8::text))
        )
        -- Si l'utilisateur n'a pas spécifié d'orientation, on considère 'both' (bisexual)
        AND (
          COALESCE(NULLIF(me.sexual_preference, ''), 'both') = 'both'
          OR (COALESCE(NULLIF(me.sexual_preference, ''), 'both') = 'male' AND p.gender = 'male')
          OR (COALESCE(NULLIF(me.sexual_preference, ''), 'both') = 'female' AND p.gender = 'female')
          OR (COALESCE(NULLIF(me.sexual_preference, ''), 'both') = 'other' AND p.gender IN ('non_binary', 'other'))
        )
        AND (
          me.gender IS NULL OR me.gender = ''
          OR COALESCE(NULLIF(p.sexual_preference, ''), 'both') = 'both'
          OR (COALESCE(NULLIF(p.sexual_preference, ''), 'both') = 'male' AND me.gender = 'male')
          OR (COALESCE(NULLIF(p.sexual_preference, ''), 'both') = 'female' AND me.gender = 'female')
          OR (COALESCE(NULLIF(p.sexual_preference, ''), 'both') = 'other' AND me.gender IN ('non_binary', 'other'))
        )
      GROUP BY u.id, u.username, u.email, u.last_seen_at, p.gender, p.sexual_preference, p.city, p.neighborhood, uf.fame_rating, p.birth_date, ph.primary_photo_url, me.city
      ORDER BY
        ${orderBySql}
      LIMIT $9::int
      OFFSET $10::int
    `;
    const result = await pool.query(sql, [
      userId,
      minAge,
      maxAge,
      minFame,
      maxFame,
      usernameFilter,
      tagsFilter,
      cityFilter,
      limit,
      offset,
    ]);

    // Add liked, is_match, and age to each user
    const users = result.rows.map((u) => {
      const liked = likesGiven.has(String(u.id));
      const likedBack = likesReceived.has(String(u.id));
      return {
        ...u,
        liked,
        is_match: liked && likedBack,
        is_online: isUserOnline(u.id),
        last_seen_at: u.last_seen_at,
        age: u.age_value,
      };
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/like — current user likes user :id
router.post("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    if (liker_user_id === liked_user_id) {
      return res.status(400).json({ error: "Impossible to like myse" });
    }

    const hasProfilePhoto = await userHasPrimaryPhoto(liker_user_id);
    if (!hasProfilePhoto) {
      return res.status(403).json({
        error: "You need a profile picture before liking another user.",
      });
    }

    const sql = `INSERT INTO likes (liker_user_id, liked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Déjà liké" });
    }

    await createNotification({
      userId: liked_user_id,
      actorUserId: liker_user_id,
      type: "like_received",
      message: "You received a like.",
      metadata: { liker_user_id },
    });

    const reciprocalLike = await pool.query(
      `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`,
      [liked_user_id, liker_user_id],
    );

    if (reciprocalLike.rowCount > 0) {
      await createNotification({
        userId: liked_user_id,
        actorUserId: liker_user_id,
        type: "match",
        message: "A user you liked liked you back.",
        metadata: { with_user_id: liker_user_id },
      });

      await createNotification({
        userId: liker_user_id,
        actorUserId: liked_user_id,
        type: "match",
        message: "A user you liked liked you back.",
        metadata: { with_user_id: liked_user_id },
      });

      // Récupérer les infos des deux utilisateurs pour personnaliser le message
      const userRes = await pool.query(
        `SELECT id, username, first_name FROM users WHERE id = $1 OR id = $2`,
        [liker_user_id, liked_user_id],
      );
      let userA = userRes.rows.find(
        (u) => String(u.id) === String(liker_user_id),
      );
      let userB = userRes.rows.find(
        (u) => String(u.id) === String(liked_user_id),
      );
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      await insertSystemMessage(
        liker_user_id,
        liked_user_id,
        `You matched with ${userB.first_name || userB.username || userB.id} on ${dateStr} at ${timeStr}`,
      );
      await insertSystemMessage(
        liked_user_id,
        liker_user_id,
        `You matched with ${userA.first_name || userA.username || userA.id} on ${dateStr} at ${timeStr}`,
      );

      try {
        const { getIO } = require("../realtime");
        const { REALTIME_EVENTS } = require("../realtime/events");
        const io = getIO && getIO();
        if (io) {
          io.to(`user:${liker_user_id}`).emit(
            REALTIME_EVENTS.MATCH_STATUS_CHANGED,
            {
              userId: liked_user_id,
              matched: true,
            },
          );
          io.to(`user:${liked_user_id}`).emit(
            REALTIME_EVENTS.MATCH_STATUS_CHANGED,
            {
              userId: liker_user_id,
              matched: true,
            },
          );
        }
      } catch (e) {
        /* ignore */
      }
    }

    res.status(201).json({ message: "Like enregistré" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id/like — current user unlikes user :id
router.delete("/users/:id/like", async (req, res, next) => {
  try {
    const liker_user_id = req.header("x-user-id");
    const liked_user_id = req.params.id;
    if (!liker_user_id || !liked_user_id) {
      return res.status(400).json({
        error: "liker_user_id (header) et liked_user_id (param) requis",
      });
    }
    if (liker_user_id === liked_user_id) {
      return res.status(400).json({ error: "Impossible to unlike myself" });
    }

    const sql = `DELETE FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`;
    const result = await pool.query(sql, [liker_user_id, liked_user_id]);
    if (result.rowCount === 0) {
      return res
        .status(200)
        .json({ message: "Like déjà retiré ou inexistant" });
    }

    // Check if this unlike breaks a match
    const reciprocalLike = await pool.query(
      `SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2`,
      [liked_user_id, liker_user_id],
    );
    if (reciprocalLike.rowCount === 0) {
      await insertSystemMessage(
        liker_user_id,
        liked_user_id,
        "You are no longer matched. You cannot send messages.",
      );
      await insertSystemMessage(
        liked_user_id,
        liker_user_id,
        "You are no longer matched. You cannot send messages.",
      );

      try {
        const { getIO } = require("../realtime");
        const { REALTIME_EVENTS } = require("../realtime/events");
        const io = getIO && getIO();
        if (io) {
          io.to(`user:${liker_user_id}`).emit(
            REALTIME_EVENTS.MATCH_STATUS_CHANGED,
            {
              userId: liked_user_id,
              matched: false,
            },
          );
          io.to(`user:${liked_user_id}`).emit(
            REALTIME_EVENTS.MATCH_STATUS_CHANGED,
            {
              userId: liker_user_id,
              matched: false,
            },
          );
        }
      } catch (e) {
        /* ignore */
      }
    }

    await createNotification({
      userId: liked_user_id,
      actorUserId: liker_user_id,
      type: "unlike",
      message: "A connected user unliked you.",
      metadata: { unliked_by_user_id: liker_user_id },
    });

    res.status(200).json({ message: "Like retiré" });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id/is-match — check if current user and user :id are a match
router.get("/users/:id/is-match", async (req, res, next) => {
  try {
    const userA = req.header("x-user-id");
    const userB = req.params.id;
    if (!userA || !userB) {
      return res
        .status(400)
        .json({ error: "user_id (header) et id (param) requis" });
    }
    if (userA === userB) {
      return res
        .status(400)
        .json({ error: "Impossible de matcher avec soi-même" });
    }
    const sql = `SELECT EXISTS (
			SELECT 1 FROM likes l1
			JOIN likes l2 ON l1.liker_user_id = l2.liked_user_id AND l1.liked_user_id = l2.liker_user_id
			WHERE l1.liker_user_id = $1 AND l1.liked_user_id = $2
		) AS is_match`;
    const result = await pool.query(sql, [userA, userB]);
    res.json({ is_match: result.rows[0].is_match });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
