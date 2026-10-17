const express = require('express');
const productController = require('../controllers/productController')
const authMiddleware = require('../middlewares/authMiddleware.js')
const router = express.Router();

// user controls
router.route('/products').get(productController.handleGetAllProducts)
router.route('/products/:id').get(productController.handleGetProductById)
router.route('/product/review').put(authMiddleware.authVerify,productController.createReview)

//admin controls
router.route('/admin/product/create').post(authMiddleware.authVerify,authMiddleware.adminCheck ,productController.handleCreateNewProduct);

router.route('/admin/reviews').get(authMiddleware.authVerify , authMiddleware.adminCheck , productController.viewReviews)
.delete(authMiddleware.authVerify , authMiddleware.adminCheck , productController.deleteReview);


router.route('/admin/products').get(authMiddleware.authVerify , authMiddleware.adminCheck , productController.handleGetAllProducts);

router.route('/admin/product/:id').put(authMiddleware.authVerify, authMiddleware.adminCheck ,productController.handleUpdateProductById)
.delete(authMiddleware.authVerify, authMiddleware.adminCheck , productController.handleDeleteProductById)

module.exports =router;