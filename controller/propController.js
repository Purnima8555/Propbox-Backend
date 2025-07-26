const Prop = require("../model/prop");
const path = require("path");
const fs = require("fs");

// Get all props
const getAllProps = async (req, res) => {
  try {
    const props = await Prop.find();
    res.status(200).json(props);
  } catch (err) {
    res.status(500).json({ message: "Error fetching props", error: err });
  }
};

// Get prop by ID
const getPropById = async (req, res) => {
  try {
    const prop = await Prop.findById(req.params.id);
    if (!prop) return res.status(404).json({ message: "Prop not found" });
    res.status(200).json(prop);
  } catch (err) {
    res.status(500).json({ message: "Error fetching prop", error: err });
  }
};

// Add new prop
const addProp = async (req, res) => {
  const {
    name,
    category,
    description,
    purchase_price,
    rental_price,
    available_stock,
    hasDiscount,
    discount_type,
    discount_percent,
    discount_start,
    discount_end,
  } = req.body;

  try {
    let parsedCategory = [];
    if (typeof category === 'string') {
      try {
        parsedCategory = JSON.parse(category);
      } catch {
        return res.status(400).json({ message: "Invalid category format. Expected an array." });
      }
    } else {
      parsedCategory = category;
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const newProp = new Prop({
      name,
      image: req.file.filename,
      category: parsedCategory,
      description,
      purchase_price,
      rental_price,
      available_stock,
      hasDiscount: hasDiscount || false,
      discount_type,
      discount_percent,
      discount_start,
      discount_end,
    });

    await newProp.save();
    res.status(201).json(newProp);
  } catch (err) {
    res.status(500).json({ message: "Error adding prop", error: err });
  }
};

// Update a prop
const updateProp = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProp = await Prop.findById(id);
    if (!currentProp) return res.status(404).json({ message: "Prop not found" });

    const updatedFields = {};

    if (req.body.name) updatedFields.name = req.body.name;
    if (req.body.description) updatedFields.description = req.body.description;
    if (req.body.purchase_price) updatedFields.purchase_price = req.body.purchase_price;
    if (req.body.rental_price) updatedFields.rental_price = req.body.rental_price;
    if (req.body.available_stock) updatedFields.available_stock = req.body.available_stock;

    if (req.body.category) {
      updatedFields.category = Array.isArray(req.body.category)
        ? req.body.category
        : req.body.category.split(",").map(c => c.trim());
    }

    if (req.body.hasDiscount === "true" || req.body.hasDiscount === true) {
      updatedFields.hasDiscount = true;
      updatedFields.discount_type = req.body.discount_type;
      updatedFields.discount_percent = Number(req.body.discount_percent) || 0;
      updatedFields.discount_start = req.body.discount_start;
      updatedFields.discount_end = req.body.discount_end;
    } else {
      updatedFields.hasDiscount = false;
      updatedFields.discount_type = undefined;
      updatedFields.discount_percent = undefined;
      updatedFields.discount_start = undefined;
      updatedFields.discount_end = undefined;
    }

    if (req.file) {
      const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
      updatedFields.image = uniqueFilename;

      const newPath = path.join(__dirname, '..', 'prop_images', uniqueFilename);
      fs.renameSync(req.file.path, newPath);

      const oldImagePath = path.join(__dirname, '..', 'prop_images', currentProp.image);
      fs.exists(oldImagePath, (exists) => {
        if (exists) {
          fs.unlink(oldImagePath, err => {
            if (err) console.error("Error deleting old image:", err);
          });
        }
      });
    }

    const updatedProp = await Prop.findByIdAndUpdate(id, updatedFields, { new: true });
    res.status(200).json({ message: "Prop updated successfully", prop: updatedProp });
  } catch (err) {
    res.status(500).json({ message: "Error updating prop", error: err.message || err });
  }
};

// Delete a prop
const deleteProp = async (req, res) => {
  try {
    const deletedProp = await Prop.findById(req.params.id);
    if (!deletedProp) return res.status(404).json({ message: "Prop not found" });

    const imagePath = path.join(__dirname, '..', 'prop_images', deletedProp.image);
    fs.exists(imagePath, exists => {
      if (exists) {
        fs.unlink(imagePath, err => {
          if (err) console.error("Error deleting image:", err);
        });
      }
    });

    await Prop.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Prop deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting prop", error: err });
  }
};

// Get props by category
const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const props = await Prop.find({ category: { $in: [category] } });
    if (props.length === 0) return res.status(404).json({ message: `No props found in: ${category}` });
    res.status(200).json(props);
  } catch (err) {
    res.status(500).json({ message: "Error fetching props by category", error: err });
  }
};

// Get latest props
const getNewProps = async (req, res) => {
  try {
    const props = await Prop.find().sort({ createdAt: -1 }).limit(10);
    if (props.length === 0) return res.status(404).json({ message: "No new props found" });
    res.status(200).json(props);
  } catch (err) {
    res.status(500).json({ message: "Error fetching new props", error: err });
  }
};

// get best props
const getBestProps = async (req, res) => {
  try {
    // Aggregate props with reviews and ratings
    const props = await Prop.aggregate([
      {
        $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "prop_id",
          as: "reviews",
        },
      },
      {
        $match: {
          "reviews.0": { $exists: true },
        },
      },
      {
        $addFields: {
          averageRating: {
            $avg: "$reviews.rating",
          },
        },
      },
      {
        $sort: {
          averageRating: -1,
        },
      },
      {
        $limit: 4,
      },
      {
        $project: {
          name: 1,
          image: 1,
          category: 1,
          description: 1,
          rental_price: 1,
          hasDiscount: 1,
          discount_type: 1,
          discount_percent: 1,
          discount_start: 1,
          discount_end: 1,
          available_stock: 1,
          availability_status: 1,
          averageRating: 1,
          reviewsCount: { $size: "$reviews" },
        },
      },
    ]);

    if (props.length === 0) {
      return res.status(404).json({ message: "No top-rated props found" });
    }

    res.status(200).json(props);
  } catch (err) {
    console.error("Error fetching best props:", err);
    res.status(500).json({ message: "Error fetching best props", error: err });
  }
};


// Get prop count
const getPropCount = async (req, res) => {
  try {
    const count = await Prop.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: "Error fetching prop count", error: err });
  }
};

// Search props by name
const getByPropName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: "Name query is required" });

    const props = await Prop.find({
      name: { $regex: name, $options: 'i' }
    });

    if (props.length === 0) {
      return res.status(404).json({ message: "No props found matching the name" });
    }

    res.status(200).json(props);
  } catch (err) {
    res.status(500).json({ message: "Error searching props", error: err });
  }
};

module.exports = {
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
};
