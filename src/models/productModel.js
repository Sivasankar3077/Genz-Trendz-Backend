const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true , 'Please enter product name']
    },
    price : {
        type : Number,
        required : [true,'Please enter product price']
    },
    stock : {
        type : Number,
        required : true,
        default : 1
    },
    mrp:{
        type : Number,
        required : true,
        default : 0
    },
    description:{
        type : String,
        required : true
    },
    category : {
        type : String,
        required : [ true , "Please enter product category"]
    },
    image:
        {   
            public_id : {
                type:String,
                required : true
            },

            url  : {
                type :String,
                required : true
            }
        }
    ,
    rating : {
        type : Number,
        default :0
    },
    noOfReviews :{
        type : Number,
        default:0
    },
    reviews : [
        {
            user : {type : mongoose.Schema.ObjectId , ref : "User" , required : true},
            avatar :{type: String},
            username : {type : String , required : true},
            rating : {type : Number , required : true},
            comment : { type : String , required : true},
            createdAt : {
                type : Date,
                default : Date.now
            }
        }
    ],
    createdBy:{
        type :mongoose.Schema.ObjectId,
        ref : "User",
    },
    createdAt : {
        type  : Date,
        required : true,
        default : Date.now
    }
});

const Product = mongoose.model('product', productSchema);
module.exports = Product;