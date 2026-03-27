const express = require("express");
const pool = require("../db");

const router = express.Router();
const allowedGenders = ["male", "female", "non_binary", "other"];
const allowedPreferences = ["male", "female", "both", "other"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseUserIdFromRequest(req) {
  const rawUserId = req.header("x-user-id");
  console.log("x-user-id reçu:", rawUserId);

  if (!rawUserId) {
    return null;
  }

  const parsed = Number(rawUserId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// resolveCurrentUserId 是一个异步函数，用于从请求中解析出当前用户的 ID。它首先调用 parseUserIdFromRequest 从请求头中获取 x-user-id，并尝试将其解析为一个整数。如果解析失败或 ID 无效，函数返回 null。否则，它会查询数据库确认该用户 ID 是否存在，如果存在则返回该 ID，否则返回 null。这种方式确保了只有有效且存在的用户 ID 才能被识别为当前用户，增强了安全性。
async function resolveCurrentUserId(req) {
  const requestedUserId = parseUserIdFromRequest(req);

  if (!requestedUserId) {
    return null;
  }

  const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
    requestedUserId,
  ]); //query 方法执行 SQL 查询，$1 是参数占位符，后面数组中的 requestedUserId 会替换掉 $1，防止 SQL 注入攻击。查询结果保存在 userResult 变量中，包含了查询返回的数据和相关信息。

  if (userResult.rows.length === 0) {
    return null;
  }

  return userResult.rows[0].id;
}

router.get("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const sql = `
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
        p.latitude,
        p.longitude,
        p.fame_rating
      FROM users as u
      LEFT JOIN profiles as p ON p.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `;  // SQL 查询语句，使用 LEFT JOIN 将 users 表和 profiles 表连接起来，以获取用户的基本信息和相关的个人资料信息。查询条件是根据用户 ID（$1）来查找特定用户的记录。查询结果将包含用户的 id、email、username、first_name、last_name、email_verified、created_at，以及 profile 中的 gender、sexual_preference、biography、birth_date、city、latitude、longitude 和 fame_rating 字段。LIMIT 1 确保只返回一条记录。

    const result = await pool.query(sql, [currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];

    // Calculate age with birthdate 
    function getAge(birthDate) {
      if (!birthDate) return null;
      const today = new Date();
      const dob = new Date(birthDate);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    }

    return res.json({
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        email_verified: row.email_verified,
        created_at: row.created_at,
      },
      profile: {
        gender: row.gender || "",
        sexual_preference: row.sexual_preference || "",
        biography: row.biography || "",
        birth_date: row.birth_date,
        age: getAge(row.birth_date),
        city: row.city || "",
        latitude: row.latitude,
        longitude: row.longitude,
        fame_rating: row.fame_rating ?? 0, // 如果 fame_rating 是 null 或 undefined，则使用 0 作为默认值
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/profile/me", async (req, res, next) => {
  try {
    const currentUserId = await resolveCurrentUserId(req);

    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

    const { biography, gender, sexual_preference, city, birth_date } = req.body;

    if (!isNonEmptyString(biography)) {
      return res.status(400).json({ error: "biography is required" });
    }

    if (!isNonEmptyString(city)) {
      return res.status(400).json({ error: "city is required" });
    }

    if (!isNonEmptyString(gender) || !allowedGenders.includes(gender)) {
      return res.status(400).json({
        error: "gender is invalid",
        allowed_values: allowedGenders,
      });
    }

    if (
      !isNonEmptyString(sexual_preference) ||
      !allowedPreferences.includes(sexual_preference)
    ) {
      return res.status(400).json({
        error: "sexual_preference is invalid",
        allowed_values: allowedPreferences,
      });
    }

    const updateSql = `
      INSERT INTO profiles (
        user_id,
        gender,
        sexual_preference,
        biography,
        birth_date,
        city,
        fame_rating
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        COALESCE($5, (SELECT birth_date FROM profiles WHERE user_id = $1), (CURRENT_DATE - INTERVAL '18 years')::date),
        $6,
        COALESCE((SELECT fame_rating FROM profiles WHERE user_id = $1), 0)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        biography = EXCLUDED.biography,
        gender = EXCLUDED.gender,
        sexual_preference = EXCLUDED.sexual_preference,
        city = EXCLUDED.city,
        birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date)
      RETURNING
        user_id,
        biography,
        gender,
        sexual_preference,
        city,
        birth_date,
        latitude,
        longitude,
        fame_rating
    `;

    const updateValues = [
      currentUserId,
      gender,
      sexual_preference,
      biography.trim(),
      birth_date || null,
      city.trim(),
    ];

    // 执行 SQL 查询，插入或更新用户的 profile 信息。使用 ON CONFLICT 子句确保如果 profile 已存在则进行更新，而不是插入新记录。COALESCE 函数用于在插入时设置默认值，如果已有记录则保留原值。查询结果将包含更新后的 profile 信息，包括 user_id、biography、gender、sexual_preference、city、birth_date、latitude、longitude 和 fame_rating 字段。
    const updated = await pool.query(updateSql, updateValues);

    // 更新完成后，再次查询用户的基本信息和 profile 信息，以便在响应中返回完整的用户数据。这个查询与之前获取用户信息的查询类似，使用 LEFT JOIN 将 users 表和 profiles 表连接起来，根据用户 ID 查找特定用户的记录，并返回相关字段。
    const userSql = `
      SELECT id, email, username, first_name, last_name, email_verified, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;

    const userResult = await pool.query(userSql, [currentUserId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const profile = updated.rows[0];

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
      profile: {
        gender: profile.gender,
        sexual_preference: profile.sexual_preference,
        biography: profile.biography,
        birth_date: profile.birth_date,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        fame_rating: profile.fame_rating,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

/**
 * 这段是“更新/创建用户 profile”的 UPSERT 语句，逐行说明：

INSERT INTO profiles (...) VALUES (...)：尝试插入一行。占位符 $1..$5 的值在后面的 updateValues 里传入：[$1=user_id, $2=gender, $3=sexual_preference, $4=biography, $5=city]。
birth_date 的值用 COALESCE(...)：
先查 profiles 里这个用户现有的 birth_date（SELECT birth_date ... WHERE user_id = $1）。
如果已有值，沿用；如果没有（返回 NULL），就用默认 (CURRENT_DATE - INTERVAL '18 years')::date，相当于默认 18 周岁生日。
fame_rating 同理：如果已有评分就沿用，否则默认 0。
ON CONFLICT (user_id) DO UPDATE SET ...：如果 user_id 已存在（唯一约束冲突），不报错，而是改为执行 UPDATE，更新传入的 biography、gender、sexual_preference、city（birth_date 和 fame_rating 在 UPDATE 部分不改，保持上面的沿用逻辑）。
RETURNING ...：把插入/更新后的字段返回给应用（包含地理坐标、评分等）。
$5 是第 6 个列 city 的值，和上面的 COALESCE 没有直接关系，只是下一个逗号后的参数占位符

含义是：如果 user_id 冲突，就把现有行更新成“这次 INSERT 提交过来的值”（EXCLUDED.*）。
对比：

EXCLUDED 是 PostgreSQL 在 ON CONFLICT ... DO UPDATE 里提供的一个“伪表”别名，指向“本次 INSERT 试图写入、但因冲突被排除的那一行”的值。用它可以在 UPDATE 子句里引用本次提交的字段值。
EXCLUDED.col：本次 INSERT 请求的值。
profiles.col（或表别名）：库里已存在、发生冲突的那行的当前值。
 */