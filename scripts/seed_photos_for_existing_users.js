require("dotenv").config();
// scripts/seed_photos_for_existing_users.js
// Ajoute 0 à 5 photos randomuser.me à chaque utilisateur existant dans la base
// Usage : node scripts/seed_photos_for_existing_users.js

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const pool = require("../db");

const MIN_PHOTOS = 0;
const MAX_PHOTOS = 5;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchRandomPhoto(gender = null, retry = 0) {
  let url = "https://randomuser.me/api/?inc=picture";
  if (gender && (gender === "male" || gender === "female")) {
    url += `&gender=${gender}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  if (
    data.results &&
    data.results[0] &&
    data.results[0].picture &&
    data.results[0].picture.large
  ) {
    return data.results[0].picture.large;
  } else if (retry < 5) {
    return await fetchRandomPhoto(gender, retry + 1);
  } else {
    return null;
  }
}

async function main() {
  console.log("Connexion à la base...");
  const client = await pool.connect();
  // Supprimer les utilisateurs pour n’en garder que 500 (on garde les 500 premiers par id croissant)
  console.log("Suppression des utilisateurs pour n’en garder que 500...");
  // Récupérer les ids à supprimer
  const { rows: toDelete } = await client.query(
    `SELECT id FROM users WHERE id NOT IN (SELECT id FROM users ORDER BY id ASC LIMIT 500)`,
  );
  const idsToDelete = toDelete.map((u) => u.id);
  if (idsToDelete.length > 0) {
    // Supprimer les dépendances dans chat_conversations
    await client.query(
      `DELETE FROM chat_conversations WHERE user_a_id = ANY($1) OR user_b_id = ANY($1)`,
      [idsToDelete],
    );
    // Ajouter ici d'autres suppressions de dépendances si besoin (likes, messages, etc.)
    // Supprimer les utilisateurs
    await client.query(`DELETE FROM users WHERE id = ANY($1)`, [idsToDelete]);
  }
  console.log("Il ne reste que 500 utilisateurs dans la table users.");
  try {
    console.log("Lecture des utilisateurs...");
    const { rows: users } = await client.query(`
      SELECT users.id, profiles.gender
      FROM users
      JOIN profiles ON profiles.user_id = users.id
    `);
    console.log(`Nombre d'utilisateurs trouvés : ${users.length}`);
    let userCount = 0;
    for (const user of users) {
      userCount++;
      console.log(
        `Utilisateur ${userCount}/${users.length} (id=${user.id}, genre=${user.gender})`,
      );
      // Suppression des anciennes photos
      await client.query("DELETE FROM user_photos WHERE user_id = $1", [
        user.id,
      ]);
      const numPhotos = getRandomInt(MIN_PHOTOS, MAX_PHOTOS);
      let primarySet = false;
      for (let j = 0; j < numPhotos; j++) {
        const url = await fetchRandomPhoto(user.gender);
        if (url) {
          await client.query(
            "INSERT INTO user_photos (user_id, data_url, is_primary) VALUES ($1, $2, $3)",
            [user.id, url, !primarySet],
          );
          if (!primarySet) primarySet = true;
          console.log(`  Photo ${j + 1}/${numPhotos} ajoutée`);
        }
      }
    }
    console.log("Photos ajoutées pour tous les utilisateurs existants.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit();
  }
}

main();
