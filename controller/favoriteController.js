const Favorite = require("../model/favorite");

// Add a prop to favorites
const addFavorite = async (req, res) => {
  try {
    const { user_id, prop_id } = req.body;

    // Check if the prop is already in favorites
    let favorite = await Favorite.findOne({ user_id, prop_id });
    if (favorite) {
      return res.status(400).json({ message: "Prop is already in favorites" });
    }

    const newFavorite = new Favorite({ user_id, prop_id, isFavorite: true });
    await newFavorite.save();

    res.status(201).json({ message: "Prop added to favorites", favorite: newFavorite });
  } catch (err) {
    console.error("Error adding favorite:", err);
    res.status(500).json({ message: "Error adding favorite", error: err });
  }
};

// Get all favorite props for a user
const getFavoritesByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const favorites = await Favorite.find({ user_id })
      .populate("prop_id", "name category purchase_price rental_price image availability_status available_stock")
      .sort({ _id: -1 });

    res.status(200).json(favorites || []);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ message: "Error fetching favorites", error: err });
  }
};

// Remove a prop from favorites
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFavorite = await Favorite.findByIdAndDelete(id);

    if (!deletedFavorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.status(200).json({ message: "Prop removed from favorites" });
  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ message: "Error removing favorite", error: err });
  }
};

module.exports = {
  addFavorite,
  getFavoritesByUser,
  removeFavorite,
};
