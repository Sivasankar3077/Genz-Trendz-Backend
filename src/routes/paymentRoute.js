const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', authMiddleware.authVerify, paymentController.createPaymentOrder);
router.post('/verify', authMiddleware.authVerify, paymentController.verifyPayment);
router.post('/failed', authMiddleware.authVerify, paymentController.markPaymentFailed);
router.post('/cancel', authMiddleware.authVerify, paymentController.cancelPaymentOrder);

module.exports = router;
