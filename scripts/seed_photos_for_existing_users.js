require("dotenv").config();
const pool = require("../db");

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;

const photoThemes = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
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

async function main() {
  const client = await pool.connect();

  try {
    console.log("📸 Seeding photos...");

    const { rows: users } = await client.query(`
      SELECT u.id, p.gender
      FROM users u
      JOIN profiles p ON p.user_id = u.id
    `);

    for (const user of users) {
      const count = rand(MIN_PHOTOS, MAX_PHOTOS);

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

      console.log(`✔ user ${user.id} seeded`);
    }

    console.log("✅ Photo seeding done");
  } catch (err) {
    console.error("❌ seed error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();