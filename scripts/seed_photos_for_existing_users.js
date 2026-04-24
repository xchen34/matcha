require("dotenv").config();
// scripts/seed_photos_for_existing_users.js
// Add random photos for existing users in the database, using free Unsplash images and randomuser.me portraits.
// This is useful for development and testing purposes, to have some photos associated with users created before the photo feature was implemented.
// Usage : node scripts/seed_photos_for_existing_users.js

async function fetchWithFallback(...args) {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(...args);
  }
  try {
    const { default: nodeFetch } = await import("node-fetch");
    return nodeFetch(...args);
  } catch (error) {
    throw new Error(
      "No fetch implementation available. Use Node.js >= 18 or install node-fetch.",
    );
  }
}
const pool = require("../db");

const MIN_PHOTOS = 0;
const MAX_PHOTOS = 5;

// Free Unsplash images by theme/tag (merged and extended)
const photoThemes = [
  // Animals
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d", // dog
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb", // cat
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // bird
  "https://images.unsplash.com/photo-1464983953574-0892a716854b", // horse
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // mountain goat
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // fox
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // owl
  // Music
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4", // guitar
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2", // piano
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // violin
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // drums
  // Sports
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c", // football
  "https://images.unsplash.com/photo-1517649763962-0c623066013b", // basketball
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // tennis
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // running
  // Games
  "https://images.unsplash.com/photo-1511512578047-dfb367046420", // chess
  "https://images.unsplash.com/photo-1519125323398-675f0ddb6308", // video games
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // board games
  // Art
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // painting
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // sculpture
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // street art
  // Travel
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // beach
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // mountain
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // city
  // Food
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836", // dish
  "https://images.unsplash.com/photo-1464306076886-debca5e8a6b0", // dessert
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // coffee
  // Cinema
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // movie theater
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // film camera
  // Reading
  "https://images.unsplash.com/photo-1519681393784-d120267933ba", // book
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // library
  // Photography
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // camera
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // photo studio
  // Fashion
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f", // fashion
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // runway
  // Coding
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c", // code
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // laptop
  // Nature
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // forest
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // river
  // Dance
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb", // dance
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // ballet
  // Fitness
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d", // fitness
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // gym
  // Coffee
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836", // coffee
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // coffee shop
  // Cars
  "https://images.unsplash.com/photo-1511918984145-48de785d4c4e", // car
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // classic car
  // Science
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // lab
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // microscope
  // Anime
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", // anime
  // Design
  "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99", // design
  "https://images.unsplash.com/photo-1465101367037-6f5ebc6e0b8a", // architecture
];

// Human portraits from randomuser.me (1.jpg to 99.jpg for each gender)
const portraits = {
  male: Array.from(
    { length: 100 },
    (_, i) => `https://randomuser.me/api/portraits/men/${i}.jpg`,
  ),
  female: Array.from(
    { length: 100 },
    (_, i) => `https://randomuser.me/api/portraits/women/${i}.jpg`,
  ),
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchRandomPhoto(gender = null, retry = 0) {
  let url = "https://randomuser.me/api/?inc=picture";
  if (gender && (gender === "male" || gender === "female")) {
    url += `&gender=${gender}`;
  }

  try {
    const res = await fetchWithFallback(url);
    if (!res || !res.ok) {
      throw new Error(`randomuser request failed: ${res?.status || "no response"}`);
    }

    const raw = await res.text();
    if (!raw || !raw.trim()) {
      throw new Error("randomuser returned empty response body");
    }

    const data = JSON.parse(raw);
    const photoUrl = data?.results?.[0]?.picture?.large;
    if (photoUrl) {
      return photoUrl;
    }
    throw new Error("randomuser response missing picture.large");
  } catch (error) {
    if (retry < 4) {
      return fetchRandomPhoto(gender, retry + 1);
    }
    return null;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Reading users...");
    const { rows: users } = await client.query(`
      SELECT users.id, profiles.gender
      FROM users
      JOIN profiles ON profiles.user_id = users.id
    `);
    console.log(`Number of users found : ${users.length}`);
    let userCount = 0;
    for (const user of users) {
      userCount++;
      console.log(
        `User ${userCount}/${users.length} (id=${user.id}, gender=${user.gender})`,
      );
      // Remove existing photos for the user (if any) to avoid duplicates if the script is run multiple times
      await client.query("DELETE FROM user_photos WHERE user_id = $1", [
        user.id,
      ]);
      const numPhotos = getRandomInt(MIN_PHOTOS, MAX_PHOTOS);
      let usedThemeIndexes = new Set();
      for (let j = 0; j < numPhotos; j++) {
        let url = null;
        if (j === 0) {
          // Human portrait for the primary photo, trying to match the user's gender if possible
          const g =
            user.gender === "male"
              ? "male"
              : user.gender === "female"
                ? "female"
                : null;
          if (g && portraits[g]) {
            url = portraits[g][getRandomInt(0, portraits[g].length - 1)];
          } else {
            // fallback: online API first, static pool as final fallback
            url = await fetchRandomPhoto();
            if (!url) {
              const allPortraits = [...portraits.male, ...portraits.female];
              url = allPortraits[getRandomInt(0, allPortraits.length - 1)];
            }
          }
        } else {
          // Theme photo for secondary photos
          let idx;
          do {
            idx = getRandomInt(0, photoThemes.length - 1);
          } while (
            usedThemeIndexes.has(idx) &&
            usedThemeIndexes.size < photoThemes.length
          );
          usedThemeIndexes.add(idx);
          url = photoThemes[idx];
        }
        if (url) {
          await client.query(
            "INSERT INTO user_photos (user_id, data_url, is_primary) VALUES ($1, $2, $3)",
            [user.id, url, j === 0],
          );
          console.log(`  Photo ${j + 1}/${numPhotos} added`);
        }
      }
    }
    console.log("Photos added for all existing users.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit();
  }
}

main();
