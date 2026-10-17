const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    shippingAddress : {
        address :{ 
            type : String,
            required : true
        },
        city :{ 
            type : String,
            required : true
        },
        state :{ 
            type : String,
            required : true
        },
        // country :{ 
        //     type : String,
        //     required : true
        // },
        pincode :{ 
            type : Number,
            required : true
        },
        phoneNo : {
            type : Number,
            required : true
        }
    },
    orderItems : [
        {
            name : {
                type : String,
                required : true
            },
            price : {
                type : Number,
                required : true
            },
            quantity : {
                type : Number,
                required : true
            },
            image : {
                type : String,
                required : true
            },
            product :{
                type : mongoose.Schema.ObjectId,
                ref :  "Product",
                required : true 
            }
        }
    ],

    orderStatus : {
        type : String,
        required : true,
        default : "Processing"
    },
    user : {
        type : mongoose.Schema.ObjectId,
        ref : "user",
        required : true
    },
    paymentInfo : {
        id : {
            type : String,
            required : true
        },
        paymentStatus : {
            type : String,
            required : true
        },
        paymentType : {
            type : String,
            required : true
        },
        razorpayOrderId : String,
        razorpayPaymentId : String
    },
    paidAt : Date,
    itemPrice : {
        type : Number,
        required : true,
        default : 0
    },
    taxPrice : {
        type : Number,
        required : true,
        default : 0
    },
    shippingPrice : {
        type : Number,
        required : true,
        default : 0
    },
    totalPrice : {
        type : Number,
        required : true,
        default : 0
    },
    deliveredAt : Date,
    createdAt : {
        type : Date,
        default : Date.now
    }
});


const Order = mongoose.model("order" , orderSchema);

module.exports = Order;