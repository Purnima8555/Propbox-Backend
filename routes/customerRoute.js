const express = require("express");
const router = express.Router();
const { findAll, save, findById, update, getCustomerCount, deleteById, getAndUpdate } = require("../controller/customerController");
const CustomerValidation = require("../validation/customerValidation");
const { authenticateToken } = require("../security/authorization");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Multer storage configuration for customer images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/profilePicture");
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    cb(null, `IMG-${Date.now()}` + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, JPEG, and PNG are allowed."), false);
    }
  },
});

router.get("/", findAll);
router.get("/count", getCustomerCount);
router.post("/save", upload.single("image"), authenticateToken, save);
router.delete("/:id", authenticateToken, deleteById);
router.get("/:id", findById);
router.put("/update/:id", authenticateToken, update);
router.put('/:id', upload.single("image"), getAndUpdate);
module.exports = router;
