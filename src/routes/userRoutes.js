const express = require('express')
const userController = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')
const wishlistController = require('../controllers/wishlistController')
const router = express.Router();

//signup
router.route('/signup').post(userController.handleSignUp);

//login
router.route('/login').post(userController.handleLogin)

// get and update profile
router.route('/profile').get(authMiddleware.authVerify , userController.handleGetProfile )
.put(authMiddleware.authVerify , userController.handleUpdateProfile)

// Wishlist (signed-in users only)
router.route('/wishlist').get(authMiddleware.authVerify, wishlistController.getWishlist)
router.route('/wishlist/:productId').post(authMiddleware.authVerify, wishlistController.addToWishlist)
router.route('/wishlist/:productId').delete(authMiddleware.authVerify, wishlistController.removeFromWishlist)

//pass update
router.route('/password/update').put(authMiddleware.authVerify , userController.updatePassword)

//forgot pass
router.route('/password/forgot').post(userController.handleForgotPassword)

//reset pass
router.route('/reset/:resetToken').post(userController.handleResetPassword)

//logout
router.route('/logout').post(authMiddleware.authVerify,userController.handleLogout)


//admin access

//get all users
router.route('/admin/users').get(authMiddleware.authVerify , authMiddleware.adminCheck , userController.hanldeGetAllUsers)

//get single user , delete user , update user role
router.route('/admin/user/:id').get(authMiddleware.authVerify , authMiddleware.adminCheck , userController.getSingleUser)
.put(authMiddleware.authVerify , authMiddleware.adminCheck  , userController.updateUserRole)
.delete(authMiddleware.authVerify , authMiddleware.adminCheck , userController.deleteUser)

module.exports = router;