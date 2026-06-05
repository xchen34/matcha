const likeService = require("../../services/likeService");
const { isUserOnline } = require("../../services/presenceService");
const { parseTagsQueryParam } = require("./helpers");

/**
 * Parse a numeric query parameter while preserving `null` for missing/invalid
 * input.
 *
 * Implementation details:
 * - Returns `null` for empty values so downstream filters can omit the field.
 * - Uses `Number()` and `Number.isFinite()` to reject non-numeric strings.
 */
function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

/**
 * Build a filtered and sorted list of user suggestions for the authenticated
 * user.
 *
 * Implementation details:
 * - Validates the authenticated user first and then reads paging/filtering
 *   controls from `req.query`.
 * - Sanitizes numeric filters through `parseOptionalNumber()` and clamps them
 *   to sensible bounds to reduce bad input and avoid runaway queries.
 * - Normalizes city, username, and tags filters before passing them to the
 *   service layer.
 * - Translates `sort_by` and `sort_dir` into a SQL `ORDER BY` fragment that the
 *   service can safely apply.
 * - Enriches the service results with relationship state (`liked`,
 *   `is_match`) and live presence (`is_online`) so the client gets a ready-to-
 *   render card model.
 */
async function getSuggestions(req, res, next) {
  try {
    const userId = String(req.userId ?? "");
    if (!userId) {
      return res.status(400).json({ error: "authenticated user required" });
    }

    const { min_age, max_age, min_fame, max_fame, username, city, tags, sort_by, sort_dir } = req.query;

    const parsedLimit = Number(req.query.limit);
    const parsedOffset = Number(req.query.offset);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const parsedMinAge = parseOptionalNumber(min_age);
    const parsedMaxAge = parseOptionalNumber(max_age);
    const minAge = parsedMinAge === null ? null : Math.min(Math.max(parsedMinAge, 18), 150);
    const maxAge = parsedMaxAge === null ? null : Math.min(Math.max(parsedMaxAge, 18), 150);
    
    const parsedMinFame = parseOptionalNumber(min_fame);
    const parsedMaxFame = parseOptionalNumber(max_fame);
    const minFame = parsedMinFame === null ? null : Math.min(Math.max(parsedMinFame, 0), 100);
    const maxFame = parsedMaxFame === null ? null : Math.min(Math.max(parsedMaxFame, 0), 100);
    
    const cityFilter = typeof city === "string" && city.trim().length > 0 ? city.trim() : null;
    
    const tagsFilter = parseTagsQueryParam(tags);
    
    const usernameFilter = typeof username === "string" && username.trim().length > 0 ? username.trim() : null;

    const normalizedSortBy = typeof sort_by === "string" ? sort_by.trim().toLowerCase() : "";
    const normalizedSortDir = String(sort_dir || "desc").trim().toLowerCase() === "asc" ? "ASC" : "DESC";

    let orderBySql = `
      (me.city IS NOT NULL AND p.city IS NOT NULL AND p.city = me.city) DESC,
      common_tags_count DESC,
      fame_rating DESC NULLS LAST,
      u.id ASC
    `;
    
    if (normalizedSortBy === "age") {
      orderBySql = `age_value ${normalizedSortDir} NULLS LAST, u.id ASC`;
    } else if (normalizedSortBy === "location") {
      orderBySql = `
        (me.city IS NOT NULL AND p.city IS NOT NULL AND LOWER(p.city) = LOWER(me.city)) DESC,
        p.city ${normalizedSortDir} NULLS LAST,
        p.neighborhood ${normalizedSortDir} NULLS LAST,
        u.id ASC
      `;
    } else if (normalizedSortBy === "fame" || normalizedSortBy === "fame_rating") {
      orderBySql = `fame_rating ${normalizedSortDir} NULLS LAST, u.id ASC`;
    } else if (normalizedSortBy === "tags") {
      orderBySql = `common_tags_count ${normalizedSortDir} NULLS LAST, fame_rating DESC NULLS LAST, u.id ASC`;
    }

    const filters = {
      minAge, maxAge, minFame, maxFame, usernameFilter, tagsFilter, cityFilter, orderBySql
    };

    const { rows, likesGiven, likesReceived } = await likeService.getSuggestions(userId, filters, limit, offset);

    const users = rows.map((u) => {
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
}

module.exports = { getSuggestions };
