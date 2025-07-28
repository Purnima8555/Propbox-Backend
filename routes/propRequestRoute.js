const express = require("express");
const router = express.Router();
const {
  submitPropRequest,
  getPendingPropRequestCount,
  getAllPropRequests,
  updatePropRequest
} = require("../controller/propRequestController");

const { authenticateToken, authorizeRole } = require("../security/authorization");


router.post("/", authenticateToken, submitPropRequest);
router.get("/pending/count", authenticateToken, getPendingPropRequestCount);
router.get("/all", authenticateToken, authorizeRole("admin"), getAllPropRequests);
router.put("/:id", authenticateToken, authorizeRole("admin"), updatePropRequest);

module.exports = router;
