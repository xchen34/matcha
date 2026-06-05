require("dotenv").config();
const pool = require("../db");

const MIN_PHOTOS = 0;
const MAX_PHOTOS = 5;
const UNSPLASH_SIZE = "w=600&h=400&fit=crop&auto=format&q=75";

function unsplashPhoto(id, size = UNSPLASH_SIZE) {
  return `https://images.unsplash.com/${id}?${size}`;
}

// Diverse photos: landscapes, nature, architecture, objects - NO people
const photoThemes = [
  // Nature & Landscapes
  unsplashPhoto("photo-1506744038136-46273834b3fb"), // mountains
  unsplashPhoto("photo-1519681393784-d120267933ba"), // ocean
  unsplashPhoto("photo-1506905925346-21bda4d32df4"), // mountain peaks
  unsplashPhoto("photo-1441974231531-c6227db76b6e"), // forest
  unsplashPhoto("photo-1470770841072-f978cf4d019e"), // lake
  unsplashPhoto("photo-1500530855697-b586d89ba3ee"), // desert
  unsplashPhoto("photo-1501785888041-af3ef285b470"), // snowy mountains
  unsplashPhoto("photo-1439066615861-d1af74d74000"), // waterfall
  unsplashPhoto("photo-1507525428034-b723cf961d3e"), // beach

  // Architecture & Urban
  unsplashPhoto("photo-1511632765486-a01980e01a18"), // skyline
  unsplashPhoto("photo-1497366216548-37526070297c"), // buildings
  unsplashPhoto("photo-1494526585095-c41746248156"), // modern house
  unsplashPhoto("photo-1479839672679-a46483c0e7c8"), // city night
  unsplashPhoto("photo-1465447142348-e9952c393450"), // bridge

  // Objects & Lifestyle
  unsplashPhoto("photo-1460661419201-fd4cecdf8a8b"), // coffee
  unsplashPhoto("photo-1492684223066-81342ee5ff30"), // books
  unsplashPhoto("photo-1506157786151-b8491531f063"), // bicycle
  unsplashPhoto("photo-1498050108023-c5249f4df085"), // laptop setup
  unsplashPhoto("photo-1515879218367-8466d910aaa4"), // coding desk
  unsplashPhoto("photo-1512436991641-6745cdb1723f"), // sneakers
  unsplashPhoto("photo-1503602642458-232111445657"), // vinyl records
  unsplashPhoto("photo-1496442226666-8d4d0e62e6e9"), // flowers
  unsplashPhoto("photo-1500534314209-a25ddb2bd429"), // plants
];

const portraits = {
  male: Array.from(
    { length: 99 },
    (_, i) => `https://randomuser.me/api/portraits/men/${i}.jpg`,
  ),
  female: Array.from(
    { length: 99 },
    (_, i) => `https://randomuser.me/api/portraits/women/${i}.jpg`,
  ),
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main(options = {}) {
  const { closePool = true } = options;
  const client = await pool.connect();

  try {
    console.log("📸 Seeding photos for fake users...");

    // Skip if seeding already done (check if photos for seed users already exist)
    const { rows: photoCount } = await client.query(`
      SELECT COUNT(*) as total FROM user_photos up
      JOIN users u ON u.id = up.user_id
      WHERE u.email LIKE 'seed.%@example.com'
    `);
    if (photoCount[0].total > 0) {
      console.log("✅ Photo seeding already completed, skipping...");
      return;
    }

    // Get only the fake seed users (those with emails starting with seed.)
    const { rows: users } = await client.query(`
      SELECT
        u.id,
        u.email,
        p.gender,
        COUNT(up.id)::int AS photo_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_photos up ON up.user_id = u.id
      WHERE u.email LIKE 'seed.%@example.com'
      GROUP BY u.id, u.email, p.gender
    `);

    console.log(`Found ${users.length} fake users to seed with photos`);

    for (const user of users) {
      if (Number(user.photo_count) > 0) {
        continue;
      }

      const count = rand(MIN_PHOTOS, MAX_PHOTOS);
      if (count === 0) {
        console.log(`✔ user ${user.id} seeded (0 photos)`);
        continue;
      }

      for (let i = 0; i < count; i++) {
        let url;

        if (i === 0) {
          const gender = user.gender === "female" ? "female" : "male";
          url =
            portraits[gender][rand(0, portraits[gender].length - 1)] ||
            photoThemes[rand(0, photoThemes.length - 1)];
        } else {
          url = photoThemes[rand(0, photoThemes.length - 1)];
        }

        await client.query(
          `
          INSERT INTO user_photos (user_id, data_url, is_primary)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `,
          [user.id, url, i === 0],
        );
      }

      console.log(`✔ fake user ${user.id} (${user.email}) seeded (${count} photos)`);
    }

    console.log("✅ Photo seeding done");
  } catch (err) {
    console.error("❌ seed error:", err.message);
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
