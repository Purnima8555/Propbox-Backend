const express = require("express");
const router = express.Router();
const {
  addFavorite,
  getFavoritesByUser,
  removeFavorite,
} = require("../controller/favoriteController");

const { authenticateToken } = require("../security/authorization");

router.post("/", authenticateToken, addFavorite);
router.get("/:user_id", authenticateToken, getFavoritesByUser);
router.delete("/:id", authenticateToken, removeFavorite);

module.exports = router;