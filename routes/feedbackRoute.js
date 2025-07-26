const express = require("express");
const router = express.Router();
const {
  getAllFeedback,
  getFeedbackByPropId,
  addFeedback,
  updateFeedback,
  deleteFeedback,
  getAverageRating
} = require("../controller/feedbackController");

const { authenticateToken } = require("../security/authorization");

router.get("/", getAllFeedback);
router.get("/prop/:prop_id", getFeedbackByPropId);
router.get("/average-rating/:prop_id", getAverageRating);
router.post("/", addFeedback);
router.patch("/:id", updateFeedback);
router.delete("/:id", deleteFeedback);

module.exports = router;
