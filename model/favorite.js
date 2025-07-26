const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "customers",
    required: true,
  },
  prop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prop",
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
