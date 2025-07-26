const Cart = require("../model/cart");
const Prop = require("../model/prop");

// Add a prop to the cart
const addToCart = async (req, res) => {
  try {
    const { user_id, prop_id, quantity, type, rentalDays } = req.body;

    if (!user_id || !prop_id) {
      return res.status(400).json({ message: "user_id and prop_id are required" });
    }

    if (!["purchase", "rental"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'purchase' or 'rental'" });
    }

    const prop = await Prop.findById(prop_id);
    if (!prop) {
      return res.status(404).json({ message: "Prop not found" });
    }

    if (type === "rental" && (!rentalDays || rentalDays < 1)) {
      return res.status(400).json({ message: "rentalDays is required for rental type and must be at least 1" });
    }

    const existingCartItem = await Cart.findOne({ user_id, prop_id });

    if (existingCartItem) {
      existingCartItem.quantity += quantity || 1;
      existingCartItem.type = type;
      existingCartItem.rentalDays = type === "rental" ? rentalDays : undefined;
      await existingCartItem.save();

      const updatedCartItem = await Cart.findById(existingCartItem._id).populate('prop_id');
      return res.status(200).json({ message: "Cart updated", cart: updatedCartItem });
    }

    const newCartItem = new Cart({
      user_id,
      prop_id,
      quantity: quantity || 1,
      type,
      rentalDays: type === "rental" ? rentalDays : undefined,
    });

    await newCartItem.save();

    const populatedCartItem = await Cart.findById(newCartItem._id).populate('prop_id');

    res.status(201).json({ message: "Prop added to cart", cart: populatedCartItem });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ message: "Error adding to cart", error: err.message });
  }
};

// Get cart items by user
const getCartByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const cartItems = await Cart.find({ user_id })
      .populate({
        path: "prop_id",
        select: "name image purchase_price rental_price",
      })
      .sort({ added_at: -1 });

    if (!cartItems.length) {
      return res.status(404).json({ message: "No items in cart" });
    }

    const enriched = cartItems.map(item => {
      const prop = item.prop_id;
      const basePrice = item.type === "purchase"
        ? prop.purchase_price
        : (prop.rental_price * (item.rentalDays / 7));

      return {
        ...item._doc,
        purchasePrice: prop.purchase_price,
        rentalPrice: prop.rental_price,
        basePrice,
        totalPrice: basePrice * item.quantity,
      };
    });

    res.status(200).json(enriched);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ message: "Error fetching cart", error: err.message });
  }
};

// Update a cart item
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, rentalDays } = req.body;

    const cartItem = await Cart.findById(id).populate("prop_id", "purchase_price rental_price");
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (quantity === 0) {
      await cartItem.deleteOne();
      return res.status(200).json({ message: "Cart item removed" });
    }

    if (quantity !== undefined) cartItem.quantity = quantity;
    if (type) {
      cartItem.type = type;
      cartItem.rentalDays = type === "rental" && rentalDays ? rentalDays : undefined;
    } else if (rentalDays && cartItem.type === "rental") {
      cartItem.rentalDays = rentalDays;
    }

    await cartItem.save();

    const prop = cartItem.prop_id;
    const basePrice = cartItem.type === "purchase"
      ? prop.purchase_price
      : (prop.rental_price * (cartItem.rentalDays / 7));

    const updatedItem = {
      ...cartItem._doc,
      purchasePrice: prop.purchase_price,
      rentalPrice: prop.rental_price,
      basePrice,
      totalPrice: basePrice * cartItem.quantity,
    };

    res.status(200).json({ message: "Cart updated", cart: updatedItem });
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ message: "Error updating cart item", error: err.message });
  }
};

// Remove a cart item
const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCartItem = await Cart.findByIdAndDelete(id);
    if (!deletedCartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.status(200).json({ message: "Cart item removed" });
  } catch (err) {
    console.error("Error removing cart item:", err);
    res.status(500).json({ message: "Error removing cart item", error: err.message });
  }
};

// Clear entire cart for a user
const clearCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    await Cart.deleteMany({ user_id });

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).json({ message: "Error clearing cart", error: err.message });
  }
};

module.exports = {
  addToCart,
  getCartByUser,
  updateCartItem,
  removeFromCart,
  clearCart,
};
