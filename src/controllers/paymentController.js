const crypto = require('crypto');
const mongoose = require('mongoose');
const razorpay = require('../config/razorpay');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

const calculateOrder = async (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    const error = new Error('Your cart is empty.');
    error.statusCode = 400;
    throw error;
  }

  let subtotal = 0;
  const finalOrderItems = [];

  for (const item of orderItems) {
    if (!item?.product || !mongoose.Types.ObjectId.isValid(item.product)) {
      const error = new Error('A product in your cart is invalid.');
      error.statusCode = 400;
      throw error;
    }

    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      const error = new Error('Product quantity must be a positive whole number.');
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findById(item.product);
    if (!product) {
      const error = new Error('A product in your cart no longer exists.');
      error.statusCode = 404;
      throw error;
    }
    if (product.stock < quantity) {
      const error = new Error(`${product.name} does not have enough stock.`);
      error.statusCode = 400;
      throw error;
    }

    subtotal += Number(product.price) * quantity;
    finalOrderItems.push({
      name: product.name,
      quantity,
      image: product.image.url,
      price: Number(product.price),
      product: product._id,
    });
  }

  subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  const taxPrice = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
  const shippingPrice = subtotal > 500 ? 0 : 100;
  const totalPrice = Math.round((subtotal + taxPrice + shippingPrice + Number.EPSILON) * 100) / 100;

  return { finalOrderItems, subtotal, taxPrice, shippingPrice, totalPrice };
};

const validateShippingAddress = (address) => {
  const requiredFields = ['address', 'city', 'state', 'pincode', 'phoneNo'];
  return address && requiredFields.every((field) => String(address[field] ?? '').trim());
};

exports.createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay || !process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
      return res.status(503).json({ success: false, message: 'Razorpay is not configured on the server.' });
    }

    const { shippingAddress, orderItems, paymentMethod } = req.body;
    if (!validateShippingAddress(shippingAddress)) {
      return res.status(400).json({ success: false, message: 'Please provide a complete shipping address.' });
    }
    if (!['UPI', 'CARD', 'ONLINE'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Choose a valid payment method.' });
    }

    // Prices are always read from MongoDB. Never trust a total sent by the browser.
    const totals = await calculateOrder(orderItems);
    const amountInPaise = Math.round(totals.totalPrice * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `genz_${Date.now()}_${String(req.user.id).slice(-6)}`.slice(0, 40),
      notes: { userId: String(req.user.id), paymentMethod },
    });

    const order = await Order.create({
      orderItems: totals.finalOrderItems,
      shippingAddress,
      paymentInfo: {
        id: razorpayOrder.id,
        paymentStatus: 'Pending',
        paymentType: 'Razorpay',
        razorpayOrderId: razorpayOrder.id,
      },
      orderStatus: 'Payment Pending',
      itemPrice: totals.subtotal,
      taxPrice: totals.taxPrice,
      shippingPrice: totals.shippingPrice,
      totalPrice: totals.totalPrice,
      user: req.user.id,
    });

    return res.status(201).json({
      success: true,
      key: process.env.RAZORPAY_KEY,
      order: razorpayOrder,
      localOrderId: order._id,
      amount: totals.totalPrice,
      message: 'Payment order created successfully.',
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to create payment order.',
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    if (!razorpay || !process.env.RAZORPAY_SECRET) {
      return res.status(503).json({ success: false, message: 'Razorpay is not configured on the server.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification details are incomplete.' });
    }

    const order = await Order.findOne({
      user: req.user.id,
      'paymentInfo.razorpayOrderId': razorpay_order_id,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'The payment order was not found.' });
    }

    // Idempotent success response for a repeated verification request.
    if (order.paymentInfo.paymentStatus === 'Paid') {
      return res.status(200).json({ success: true, message: 'Payment already verified.', orderId: order._id });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const received = Buffer.from(String(razorpay_signature));
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    // Fetch the payment from Razorpay and verify its order, amount and currency server-side.
    let payment = await razorpay.payments.fetch(razorpay_payment_id);
    const expectedAmount = Math.round(Number(order.totalPrice) * 100);
    if (
      payment.order_id !== razorpay_order_id ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== 'INR'
    ) {
      return res.status(400).json({ success: false, message: 'Payment details do not match this order.' });
    }

    // If the payment is authorized but not captured, attempt capture before confirming the order.
    if (payment.status === 'authorized') {
      payment = await razorpay.payments.capture(razorpay_payment_id, expectedAmount, 'INR');
    }
    if (payment.status !== 'captured') {
      return res.status(409).json({
        success: false,
        message: `Payment is ${payment.status}. The order has not been marked as paid.`,
      });
    }

    order.paymentInfo.id = razorpay_payment_id;
    order.paymentInfo.paymentStatus = 'Paid';
    order.paymentInfo.paymentType = 'Razorpay';
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.orderStatus = 'Processing';
    order.paidAt = new Date();
    await order.save();

    return res.status(200).json({ success: true, message: 'Payment verified successfully.', orderId: order._id });
  } catch (error) {
    console.error('Razorpay payment verification failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify payment. Please contact support before retrying.' });
  }
};

exports.markPaymentFailed = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    if (!razorpay_order_id) return res.status(400).json({ success: false, message: 'Razorpay order ID is required.' });

    const order = await Order.findOne({ user: req.user.id, 'paymentInfo.razorpayOrderId': razorpay_order_id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentInfo.paymentStatus !== 'Paid') {
      order.paymentInfo.paymentStatus = 'Failed';
      order.orderStatus = 'Payment Failed';
      await order.save();
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Could not update failed payment:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update payment status.' });
  }
};

exports.cancelPaymentOrder = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    if (!razorpay_order_id) return res.status(400).json({ success: false, message: 'Razorpay order ID is required.' });

    const order = await Order.findOne({ user: req.user.id, 'paymentInfo.razorpayOrderId': razorpay_order_id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentInfo.paymentStatus === 'Pending') {
      order.paymentInfo.paymentStatus = 'Cancelled';
      order.orderStatus = 'Payment Cancelled';
      await order.save();
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Could not cancel payment order:', error.message);
    return res.status(500).json({ success: false, message: 'Could not cancel payment order.' });
  }
};
