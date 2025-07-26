const express = require("express");
const router = express.Router();
const { register, login, forgotPassword, resetPassword, verifyCode, checkUserExists } = require("../controller/authController");
const CustomerValidation = require("../validation/customerValidation");
const upload = require("../middleware/uploads");
const { uploadImage } = require("../controller/authController");

router.post("/uploadImage", upload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    return res.status(200).json({ success: true, data: req.file.filename });
});
router.post("/register", upload, CustomerValidation, register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-code", verifyCode);
router.post("/check-user-exists", checkUserExists);

module.exports = router;