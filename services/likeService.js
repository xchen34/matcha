const pool = require("../db");

class LikeService {
  /*  ========== Helpers  ========== */
  // Check if the given user IDs exist in the database
  async checkUsersExist(userIds) {
    const result = await pool.query(
      `SELECT id FROM users WHERE id = ANY($1::int[])`,
      [userIds],
    );

    return new Set(result.rows.map((row) => Number(row.id)));
  }

  // Check if the user has at least one primary photo set
  async userHasPrimaryPhoto(userId) {
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

  /*  ========== Profile Views & Likes  ========== */
  // Inserts a profile view record,
  async insertProfileView(viewerId, viewedId) {
    const result = await pool.query(
      `
      INSERT INTO profile_views (viewer_user_id, viewed_user_id)
      VALUES ($1, $2)
      ON CONFLICT (viewer_user_id, viewed_user_id)
      DO UPDATE SET created_at = NOW()
      RETURNING viewer_user_id, viewed_user_id, created_at
      `,
      [viewerId, viewedId],
    );

    return result.rowCount > 0;
  }

  // Check if a like already exists between the liker and liked users
  async checkLikeExists(likerId, likedId) {
    const result = await pool.query(
      `
      SELECT 1 
      FROM likes 
      WHERE liker_user_id = $1 
        AND liked_user_id = $2
      `,
      [likerId, likedId],
    );

    return result.rowCount > 0;
  }

  // Insert a like record, ensuring no duplicates due to the ON CONFLICT clause
  async insertLike(likerId, likedId) {
    const result = await pool.query(
      `
      INSERT INTO likes (liker_user_id, liked_user_id) 
      VALUES ($1, $2) 
      ON CONFLICT DO NOTHING RETURNING *
      `,
      [likerId, likedId],
    );

    return result.rowCount > 0;
  }

  // Remove a like record if it exists
  async removeLike(likerId, likedId) {
    const result = await pool.query(
      `DELETE FROM likes 
      WHERE liker_user_id = $1 
        AND liked_user_id = $2`,
      [likerId, likedId],
    );

    return result.rowCount > 0;
  }

  /*  ========== Usernames & Match Status for Conversations List  ========== */
  // Get basic user info
  async getUserNames(userIdA, userIdB) {
    const res = await pool.query(
      `
      SELECT id, username, first_name 
      FROM users 
      WHERE id = $1 OR id = $2
      `,
      [userIdA, userIdB],
    );

    return res.rows;
  }

  // Get the latest like received by the user from each unique liker with their info
  async getLikesReceived(userId) {
    const sql = `
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
          WHERE user_id = u.id AND is_primary = TRUE
          ORDER BY id DESC LIMIT 1
        ) up ON TRUE
        WHERE l.liked_user_id = $1
        ORDER BY u.id, l.created_at DESC
      ) latest_likes
      ORDER BY created_at DESC, id DESC
    `;
    const result = await pool.query(sql, [userId]);

    return result.rows;
  }

  // Get the latest profile view received by the user from each unique viewer with their info
  async getViewsReceived(userId) {
    const sql = `
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
          WHERE user_id = u.id AND is_primary = TRUE
          ORDER BY id DESC LIMIT 1
        ) up ON TRUE
        WHERE v.viewed_user_id = $1
        ORDER BY u.id, v.created_at DESC
      ) latest_views
      ORDER BY created_at DESC, id DESC
    `;
    const result = await pool.query(sql, [userId]);

    return result.rows;
  }

  // Get match for the user with their info
  async getMatches(userId) {
    const sql = `
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
        ORDER BY id DESC LIMIT 1
      ) up ON TRUE
      WHERE EXISTS (
        SELECT 1 FROM likes a
        JOIN likes b ON b.liker_user_id = a.liked_user_id 
          AND b.liked_user_id = a.liker_user_id
        WHERE a.liker_user_id = $1 
          AND a.liked_user_id = u.id
      )
      ORDER BY matched_at DESC
    `;
    const result = await pool.query(sql, [userId]);

    return result.rows;
  }

  // Check if a match exists between two users
  async checkMatchExists(userA, userB) {
    const sql = `
      SELECT EXISTS (
        SELECT 1 FROM likes l1
        JOIN likes l2 ON l1.liker_user_id = l2.liked_user_id
          AND l1.liked_user_id = l2.liker_user_id
        WHERE l1.liker_user_id = $1 
        AND l1.liked_user_id = $2
      ) AS is_match
    `;
    const result = await pool.query(sql, [userA, userB]);

    return result.rows[0]?.is_match || false;
  }

  /*  ========== Match Suggestions with Filters  ========== */
  // Generates user suggestions based on city, tags, fame rating
  async getSuggestions(userId, filters, limit, offset) {
    const {
      minAge,
      maxAge,
      minFame,
      maxFame,
      usernameFilter,
      tagsFilter,
      cityFilter,
      orderBySql,
    } = filters;

    const likesGivenRes = await pool.query(
      `
      SELECT liked_user_id 
      FROM likes 
      WHERE liker_user_id = $1
      `,
      [userId],
    );
    const likesReceivedRes = await pool.query(
      `
      SELECT liker_user_id 
      FROM likes 
      WHERE liked_user_id = $1
      `,
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
        SELECT city, gender, sexual_preference, latitude, longitude
        FROM profiles
        WHERE user_id = $1
      ),
      me_tags AS (
        SELECT tag_id FROM user_profile_tags WHERE user_id = $1
      ),
      user_fame AS (
        SELECT u.id,
          GREATEST(LEAST(
            FLOOR(COALESCE((SELECT COUNT(*) 
              FROM profile_views 
              WHERE viewed_user_id = u.id), 0)::numeric / 20) + 
            FLOOR(COALESCE((SELECT COUNT(*) 
              FROM likes 
              WHERE liked_user_id = u.id), 0)::numeric / 5) + 
            CASE WHEN COALESCE((SELECT COUNT(*) 
              FROM likes 
              WHERE liked_user_id = u.id 
                AND created_at > NOW() - INTERVAL '7 days'), 0) = 0 THEN -1 ELSE 0 END,
            100), 0)::int AS fame_rating
        FROM users u
      )
      SELECT
        u.id, u.username, u.email, u.last_seen_at,
        p.gender, p.sexual_preference, p.city, p.neighborhood,
        uf.fame_rating, p.birth_date, ph.primary_photo_url,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date))::int AS age_value,
        CASE
          WHEN me.latitude IS NULL OR me.longitude IS NULL 
              OR p.latitude IS NULL OR p.longitude IS NULL
            THEN NULL
          ELSE (
            6371 * acos(
              least(
                1,
                greatest(
                  -1,
                  cos(radians(me.latitude::double precision)) * cos(radians(p.latitude::double precision)) *
                  cos(radians((p.longitude::double precision) - (me.longitude::double precision))) +
                  sin(radians(me.latitude::double precision)) * sin(radians(p.latitude::double precision))
                )
              )
            )
          )
        END AS distance_km,
        COUNT(DISTINCT mt.tag_id)::int AS common_tags_count,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT t.name), NULL), ARRAY[]::varchar[]) AS tags
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
        AND u.deleted_at IS NULL
        AND p.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM fake_account_reports far WHERE far.reporter_user_id = $1 AND far.reported_user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE (ub.blocker_user_id = $1 AND ub.blocked_user_id = u.id) OR (ub.blocker_user_id = u.id AND ub.blocked_user_id = $1))
        AND ($2::int IS NULL OR (p.birth_date IS NOT NULL AND p.birth_date <= CURRENT_DATE - ($2::text || ' years')::interval))
        AND ($3::int IS NULL OR (p.birth_date IS NOT NULL AND p.birth_date >= CURRENT_DATE - ($3::text || ' years')::interval))
        AND ($4::numeric IS NULL OR uf.fame_rating >= $4::numeric)
        AND ($5::numeric IS NULL OR uf.fame_rating <= $5::numeric)
        AND ($6::text IS NULL OR u.username ILIKE ('%' || $6::text || '%'))
        AND ($7::text[] IS NULL OR EXISTS (SELECT 1 FROM user_profile_tags uptf JOIN tags tf ON tf.id = uptf.tag_id WHERE uptf.user_id = u.id AND tf.name = ANY($7::text[])))
        AND ($8::text IS NULL OR (p.city IS NOT NULL AND LOWER(p.city) = LOWER($8::text)))
        AND (
          (
            COALESCE(NULLIF(me.sexual_preference, ''), 'both') = 'both'
            AND p.gender IN ('male', 'female')
          )
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
      GROUP BY
        u.id, u.username, u.email, u.last_seen_at,
        p.gender, p.sexual_preference, p.city, p.neighborhood, p.latitude, p.longitude,
        uf.fame_rating, p.birth_date, ph.primary_photo_url,
        me.city, me.latitude, me.longitude
      ORDER BY ${orderBySql}
      LIMIT $9::int OFFSET $10::int
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

    return {
      rows: result.rows,
      likesGiven,
      likesReceived,
    };
  }
}

module.exports = new LikeService();
