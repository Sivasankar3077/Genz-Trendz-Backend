const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware.js')
const orderController = require('../controllers/orderController.js')
const router = express.Router();


router.route('/new/order').post(authMiddleware.authVerify , orderController.createNewOrder)
router.route('/orders').get(authMiddleware.authVerify , orderController.getOrders)
router.route('/order/:id').get(authMiddleware.authVerify , orderController.getSingleOrder)


//admin
router.route('/admin/orders').get(authMiddleware.authVerify , authMiddleware.adminCheck , orderController.getAllOrdersByAdmin)
router.route('/admin/order/:id').delete(authMiddleware.authVerify , authMiddleware.adminCheck , orderController.deleteOrderByAdmin)
.put(authMiddleware.authVerify ,authMiddleware.adminCheck , orderController.updateOrderStatus)

module.exports = router;