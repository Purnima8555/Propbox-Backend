const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  prop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prop",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  type: {
    type: String,
    enum: ["purchase", "rental"],
    required: true,
    default: "purchase",
  },
  rentalDays: {
    type: Number,
    min: 1,
    required: function () {
      return this.type === "rental";
    },
  },
  added_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Cart", cartSchema);
