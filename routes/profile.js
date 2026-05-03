const express = require("express");
const {
  getProfileTags,
  getReverseGeocode,
  validateLocation,
  getCityNeighborhoods,
  getCitySuggestions,
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
} = require("../controllers/profile");

const router = express.Router();

router.get("/profile/tags", getProfileTags);
router.get("/profile/reverse-geocode", getReverseGeocode);
router.get("/profile/validate-location", validateLocation);
router.get("/profile/city-neighborhoods", getCityNeighborhoods);
router.get("/profile/city-suggestions", getCitySuggestions);
router.get("/profile/me", getMyProfile);
router.get("/profile/:id", getPublicProfile);
router.put("/profile/me", updateMyProfile);

module.exports = router;

