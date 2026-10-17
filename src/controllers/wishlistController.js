const mongoose = require('mongoose');
const User = require('../models/userModel');
const Product = require('../models/productModel');

// Return the signed-in user's saved products.
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'name price mrp image rating noOfReviews stock category'
    });

    if (!user) {
      return res.status(404).json({ status: 'failed', msg: 'User not found' });
    }

    return res.status(200).json({ status: 'success', wishlist: user.wishlist || [] });
  } catch (error) {
    return res.status(500).json({ status: 'failed', msg: 'Unable to load wishlist', error: error.message });
  }
};

// Add a product to the wishlist. $addToSet prevents duplicates.
exports.addToWishlist = async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ status: 'failed', msg: 'Invalid product id' });
  }

  try {
    const product = await Product.findById(productId).select('name price mrp image rating noOfReviews stock category');
    if (!product) {
      return res.status(404).json({ status: 'failed', msg: 'Product not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wishlist: product._id } },
      { new: true }
    ).populate({ path: 'wishlist', select: 'name price mrp image rating noOfReviews stock category' });

    if (!user) {
      return res.status(404).json({ status: 'failed', msg: 'User not found' });
    }

    return res.status(200).json({ status: 'success', msg: 'Added to wishlist', wishlist: user.wishlist, product });
  } catch (error) {
    return res.status(500).json({ status: 'failed', msg: 'Unable to add product to wishlist', error: error.message });
  }
};

// Remove a saved product.
exports.removeFromWishlist = async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ status: 'failed', msg: 'Invalid product id' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate({ path: 'wishlist', select: 'name price mrp image rating noOfReviews stock category' });

    if (!user) {
      return res.status(404).json({ status: 'failed', msg: 'User not found' });
    }

    return res.status(200).json({ status: 'success', msg: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (error) {
    return res.status(500).json({ status: 'failed', msg: 'Unable to remove product from wishlist', error: error.message });
  }
};
