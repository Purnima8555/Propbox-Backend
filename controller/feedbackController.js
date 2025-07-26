const Customer = require("../model/customer");
const Feedback = require("../model/feedback");
const mongoose = require("mongoose");

// Add Feedback for a Prop
const addFeedback = async (req, res) => {
  try {
    const { user_id, prop_id, rating, comment } = req.body;

    if (rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 0 and 5" });
    }

    const newFeedback = new Feedback({
      user_id,
      prop_id,
      rating,
      comment,
    });

    await newFeedback.save();

    // Fetch username and image from Customer
    const user = await Customer.findById(user_id).select("username image");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Construct response matching getFeedbackByPropId structure
    const feedbackResponse = {
      _id: newFeedback._id,
      user_id: newFeedback.user_id,
      prop_id: newFeedback.prop_id,
      rating: newFeedback.rating,
      comment: newFeedback.comment,
      date: newFeedback.date,
      __v: newFeedback.__v,
      username: user.username,
    };

    res.status(201).json({
      message: "Feedback added successfully",
      feedback: feedbackResponse,
    });
  } catch (err) {
    console.error("Error adding feedback:", err);
    res.status(500).json({ message: "Error adding feedback", error: err.message });
  }
};

// Get All Feedback
const getAllFeedback = async (req, res) => {
  try {
    const feedbackList = await Feedback.find()
      .populate("user_id", "username")
      .populate("prop_id", "name") // assuming Prop has a 'name' field
      .sort({ date: -1 });

    res.status(200).json(feedbackList);
  } catch (err) {
    console.error("Error fetching all feedback:", err);
    res.status(500).json({ message: "Error fetching all feedback", error: err.message });
  }
};

// Get Feedback by Prop ID
const getFeedbackByPropId = async (req, res) => {
  try {
    const { prop_id } = req.params;

    const feedbackList = await Feedback.find({ prop_id }).sort({ date: -1 });

    // Transform feedback to include username and image
    const populatedFeedback = await Promise.all(
      feedbackList.map(async (feedback) => {
        const user = await Customer.findById(feedback.user_id).select("username image");
        return {
          _id: feedback._id,
          user_id: feedback.user_id,
          prop_id: feedback.prop_id,
          rating: feedback.rating,
          comment: feedback.comment,
          date: feedback.date,
          __v: feedback.__v,
          username: user ? user.username : "Unknown",
          image: user ? user.image : null,
        };
      })
    );

    res.status(200).json(populatedFeedback.length > 0 ? populatedFeedback : []);
  } catch (err) {
    console.error("Error fetching feedback by prop ID:", err);
    res.status(500).json({ message: "Error fetching feedback by prop ID", error: err.message });
  }
};

// Update Feedback
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const updatedFeedback = await Feedback.findByIdAndUpdate(
      id,
      { rating, comment, date: Date.now() },
      { new: true }
    );

    if (!updatedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.status(200).json({
      message: "Feedback updated successfully",
      feedback: updatedFeedback,
    });
  } catch (err) {
    console.error("Error updating feedback:", err);
    res.status(500).json({ message: "Error updating feedback", error: err.message });
  }
};

// Delete Feedback
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFeedback = await Feedback.findByIdAndDelete(id);

    if (!deletedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (err) {
    console.error("Error deleting feedback:", err);
    res.status(500).json({ message: "Error deleting feedback", error: err.message });
  }
};

// Get Average Rating for a Prop
const getAverageRating = async (req, res) => {
  try {
    const { prop_id } = req.params;

    // Convert prop_id to ObjectId
    const objectId = new mongoose.Types.ObjectId(prop_id);

    // Aggregate to calculate average rating
    const averageRating = await Feedback.aggregate([
      { $match: { prop_id: objectId } },
      {
        $group: {
          _id: "$prop_id",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    // If no feedback exists, return 0 rating with a success status
    if (!averageRating || averageRating.length === 0) {
      return res.status(200).json({
        prop_id: prop_id,
        averageRating: 0,
        totalReviews: 0,
      });
    }

    res.status(200).json({
      prop_id: prop_id,
      averageRating: parseFloat(averageRating[0].averageRating.toFixed(2)),
      totalReviews: averageRating[0].totalReviews,
    });
  } catch (err) {
    console.error("Error fetching average rating:", err);
    res.status(500).json({ message: "Error fetching average rating", error: err.message });
  }
};

module.exports = {
  addFeedback,
  getAllFeedback,
  getFeedbackByPropId,
  updateFeedback,
  deleteFeedback,
  getAverageRating,
};
