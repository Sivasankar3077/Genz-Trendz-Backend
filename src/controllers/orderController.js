const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const User = require('../models/userModel')


//create a order
const createNewOrder = async (req, res, next) => {

    try {
        const {shippingAddress,orderItems} = req.body

        if (!shippingAddress) {
            return res.status(400).json({
                status: "failed",
                msg: "Shipping address is required"
            })
        }

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({
                status: "failed",
                msg: "No order items found"
            })
        }

        let subtotal = 0

        const finalOrderItems = []
        for (const item of orderItems) {
            const product = await Product.findById(item.product)

            if (!product) {
                return res.status(404).json({
                    status: "failed",
                    msg: `Product not found`
                })
            }

            if (item.quantity <= 0) {
                return res.status(400).json({
                    status: "failed",
                    msg: "Invalid quantity"
                })
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    status: "failed",
                    msg: `${product.name} is out of stock`
                })
            }

            subtotal += product.price * item.quantity

            finalOrderItems.push({
                name: product.name,
                quantity: item.quantity,
                image: product.image.url,
                price: product.price,
                product: product._id
            })
        }

        const taxPrice = subtotal * 0.18

        const shippingPrice =
            subtotal > 500 ? 0 : 100

        const totalPrice =
            subtotal + taxPrice + shippingPrice

        const order = await Order.create({

            orderItems: finalOrderItems,
            shippingAddress,
            paymentInfo: { id: 'COD', paymentStatus: 'Pending', paymentType: 'COD' },
            orderStatus: 'Processing',
            itemPrice: subtotal,
            taxPrice,
            shippingPrice,
            totalPrice,
            user: req.user.id
        })

        res.status(201).json({
            status: "success",
            order,
            msg : "Order created successfully"
        })

    } catch (error) {
        res.status(500).json({status:"failed" , msg:"Error in create order" , err:error.message})
    }
}

//get single order
const getSingleOrder = async(req,res)=>{
    try{
        const order = await Order.findById({_id : req.params.id , user : req.user.id})
        if(!order){
            return res.status(404).json({status :"failed" , msg : "Order not found"})
        }

        return res.status(200).json({status :"success" , order})
    }
    catch(err){
        return res.status(500).json({status :"failed" , msg : err.message})
    }
}

//get all user orders
const getOrders = async(req,res)=>{
    try{
        const orders = await Order.find({user : req.user.id}).populate("user" , "username email");
        if(!orders){
            return res.status(404).json({status :"failed" , msg : "Orders not found"})
        }

        let totalOrdersAmount = 0;
        orders.forEach((order)=> totalOrdersAmount += order.totalPrice)
        return res.status(200).json({status :"success" , orders , totalOrdersAmount})
    }
    catch(err){
        return res.status(500).json({status :"failed" , msg : err.message})
    }
}

//get all orders by admin
const getAllOrdersByAdmin = async (req,res) => {
    try{
        const orders = await Order.find().populate("user" , 'username email')
        if(!orders){
            return res.status(404).json({status :"failed" , msg : "Orders not found"})
        }

        let totalOrderAmount = 0;
        orders.forEach((order)=>totalOrderAmount += order.totalPrice)
        console.log(totalOrderAmount)
        return res.status(200).json({status :"success" , orders , total : totalOrderAmount , msg:"Orders loaded successfully"})

    }
    catch(err){
        return res.status(500).json({status :"failed" , msg : err.message})
    }
}   

//delete single order by admin
const deleteOrderByAdmin = async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id);
        if(!order){
            return res.status(404).json({status :"failed" , msg : "Order not found"})
        }

        if(order.orderStatus !== "Delivered"){
            return res.status(400).json({status :"failed" , msg : "Order is under processing, cannot be delete"})
        }
        await Order.deleteOne({_id : req.params.id})
        return res.status(200).json({status :"success" , msg : "Order deleted successfully"})
    }
    catch(err){
        return res.status(500).json({status :"failed" , msg : err.message})
    }
}

//update order status by admin
const updateOrderStatus = async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id)
        if(!order){
            return res.status(404).json({status :"failed" , msg : "Order not found"})
        }

        if (order.paymentInfo?.paymentType === 'Razorpay' && order.paymentInfo?.paymentStatus !== 'Paid') {
            return res.status(400).json({ status: 'failed', msg: 'This online order cannot be processed until payment is confirmed.' });
        }

        order.orderStatus = req.body.status;
        if(order.orderStatus === "Delivered"){
            order.deliveredAt = Date.now();
        }

        await order.save({validateBeforeSave : false})
        return res.status(200).json({status :"success" , msg : "Status updated successfully" , order})

    }
    catch(err){
        return res.status(500).json({status :"failed" , msg : err.message})
    }

}



module.exports = {
    createNewOrder,
    getSingleOrder,
    getOrders,
    getAllOrdersByAdmin,
    deleteOrderByAdmin,
    updateOrderStatus
    
}