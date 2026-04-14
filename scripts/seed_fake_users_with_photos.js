// scripts/seed_fake_users_with_photos.js
// Usage: node scripts/seed_fake_users_with_photos.js

const fs = require("fs");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const NUM_USERS = 500;
const MIN_PHOTOS = 0;
const MAX_PHOTOS = 5;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchRandomUser(retry = 0) {
  const res = await fetch("https://randomuser.me/api/?nat=fr");
  const data = await res.json();
  if (
    data.results &&
    data.results[0] &&
    data.results[0].login &&
    data.results[0].email
  ) {
    return data.results[0];
  } else if (retry < 5) {
    return await fetchRandomUser(retry + 1);
  } else {
    return null;
  }
}

async function fetchRandomPhoto(retry = 0) {
  const res = await fetch("https://randomuser.me/api/?inc=picture");
  const data = await res.json();
  if (
    data.results &&
    data.results[0] &&
    data.results[0].picture &&
    data.results[0].picture.large
  ) {
    return data.results[0].picture.large;
  } else if (retry < 5) {
    return await fetchRandomPhoto(retry + 1);
  } else {
    return null;
  }
}

async function generateSeedUsers(numUsers) {
  const users = [];
  let i = 0;
  while (users.length < numUsers) {
    const userData = await fetchRandomUser();
    if (!userData) {
      continue; // Ignore si l'utilisateur n'est pas valide
    }
    const numPhotos = getRandomInt(MIN_PHOTOS, MAX_PHOTOS);
    const photos = [];
    for (let j = 0; j < numPhotos; j++) {
      const url = await fetchRandomPhoto();
      if (url) {
        photos.push({
          url,
          isPrimary: j === 0, // La première photo est principale
        });
      }
    }
    users.push({
      username: userData.login.username,
      email: userData.email,
      firstName: userData.name.first,
      lastName: userData.name.last,
      gender: userData.gender,
      birthdate: userData.dob.date,
      city: userData.location.city,
      country: userData.location.country,
      photos, // tableau de photos (peut être vide)
    });
    i++;
  }
  return users;
}

(async () => {
  const users = await generateSeedUsers(NUM_USERS);
  fs.writeFileSync(
    "scripts/fake_users_with_photos.json",
    JSON.stringify(users, null, 2),
  );
  console.log("Fichier fake_users_with_photos.json généré avec succès !");
})();
