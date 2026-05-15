const express = require("express");
const usersController = require("../controllers/users");

const router = express.Router();

/*  ========== USER QUERIES  ========== */
router.get("/users", usersController.getAllUsers);
router.get("/users/:id", usersController.getUserById);

/*  ========== USER MANAGEMENT  ========== */
router.post("/users", usersController.createUser);
router.put("/users/:id", usersController.updateUser);
router.delete("/users/:id", usersController.deleteUser);

module.exports = router;
