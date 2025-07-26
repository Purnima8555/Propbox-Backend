const express = require("express");
const router = express.Router();
const {
  submitPropRequest,
  getPendingPropRequestCount,
  getAllPropRequests,
  updatePropRequest
} = require("../controller/propRequestController");

const { authenticateToken } = require("../security/authorization");


router.post("/", authenticateToken, submitPropRequest);
router.get("/pending/count", authenticateToken, getPendingPropRequestCount);
router.get("/all", authenticateToken, getAllPropRequests);
router.put("/:id", authenticateToken, updatePropRequest);

module.exports = router;
