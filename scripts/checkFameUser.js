const pool = require("../db");

async function checkUser() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.username,
        (SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id) AS views_count,
        (SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days') AS likes_recent_7d,
        FLOOR(COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20)::int AS views_part,
        FLOOR(COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5)::int AS likes_part,
        CASE WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0 THEN -1 ELSE 0 END AS malus,
        GREATEST(LEAST(
          FLOOR(COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20) +
          FLOOR(COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5) +
          CASE WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0 THEN -1 ELSE 0 END,
          100), 0)::int AS fame_calculated
      FROM users u
      WHERE u.username ILIKE $1
      LIMIT 1
    `, ['%seed_david_273%']);

    if (result.rows.length === 0) {
      console.log("❌ User not found");
      process.exit(0);
    }

    const row = result.rows[0];
    
    console.log("\n📊 User Stats for:", row.username);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("Views received:", row.views_count);
    console.log("Likes received:", row.likes_count);
    console.log("Likes in last 7 days:", row.likes_recent_7d);
    
    console.log("");
    console.log("📈 Fame Calculation:");
    console.log("  Views contribution (floor(views/20)):", row.views_part);
    console.log("  Likes contribution (floor(likes/5)):", row.likes_part);
    console.log("  Malus (no recent likes?):", row.malus);
    
    console.log("  Sum:", row.views_part, "+", row.likes_part, "+", row.malus, "=", (row.views_part + row.likes_part + row.malus));
    console.log("  Bounded [0..100]:", row.fame_calculated);
    console.log("");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkUser();
