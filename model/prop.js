const mongoose = require("mongoose");

const propSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: [String],
      enum: [
        "Costume",
        "Accessory & Props",
        "Makeup & Hair",
        "Set & Stage Decor"
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    purchase_price: {
      type: Number,
      required: true,
    },
    rental_price: {
      type: Number,
      required: true,
    },
    available_stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    availability_status: {
      type: String,
    },
    hasDiscount: {
      type: Boolean,
      default: false,
    },
    discount_type: {
      type: String, // e.g., "percentage", "flat"
    },
    discount_percent: {
      type: Number,
    },
    discount_start: {
      type: Date,
    },
    discount_end: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Automatically set availability_status
propSchema.pre("save", function (next) {
  this.availability_status = this.available_stock > 0 ? 'yes' : 'no';
  next();
});

propSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.available_stock !== undefined) {
    this.set({ availability_status: update.available_stock > 0 ? 'yes' : 'no' });
  }
  next();
});

const Prop = mongoose.model("Prop", propSchema);

module.exports = Prop;
