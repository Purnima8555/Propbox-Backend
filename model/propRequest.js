const mongoose = require("mongoose");

const propRequestSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "customers",
    },
    prop_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    urgency: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    reason: {
      type: String,
      enum: ["not-in-system", "out-of-stock", "new-release", "other"],
      default: "not-in-system",
    },
    additional_info: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const PropRequest = mongoose.model("PropRequest", propRequestSchema);

module.exports = PropRequest;
