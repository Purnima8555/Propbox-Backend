const express = require("express");
const router = express.Router();

const {
  getAllProps,
  getPropById,
  addProp,
  updateProp,
  deleteProp,
  getByCategory,
  getNewProps,
  getBestProps,
  getPropCount,
  getByPropName,
} = require("../controller/propController");

const { authenticateToken, authorizeRole } = require("../security/authorization");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configure image upload for props
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../prop_images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
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

// Routes for props

// Specific routes first
router.get("/count", authenticateToken, getPropCount);
router.get("/new", getNewProps);
router.get("/best/bestprops", getBestProps);
router.get("/category/:category", getByCategory);
router.get("/search", getByPropName);

// General routes
router.get("/", getAllProps);
router.get("/:id", getPropById);
router.post("/add", upload.single("image"), addProp);
router.put("/update/:id", upload.single("image"), authenticateToken, updateProp);
router.delete("/delete/:id", authenticateToken, deleteProp);

module.exports = router;
