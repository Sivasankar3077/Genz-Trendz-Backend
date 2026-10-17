const Product = require('../models/productModel')
const APIHelper = require('../helper/APIHelper')
const cloudinary = require('../config/cloudinary')


//get all products
async function handleGetAllProducts(req,res){   
    try{
        const resultPerPage = 10;
        const countHelper = new APIHelper(Product.find() , req.query).search().filter()
        const productCount= await countHelper.query.countDocuments();
        const totalPages = Math.ceil(productCount / resultPerPage)
        const currentPage = Number(req.query.page) || 1;
        if(totalPages > 0 && currentPage > totalPages){
            return res.status(404).json({'status' : "failed" , msg : "Page doesnot exists"})
        }
        const apiHelper = new APIHelper(Product.find() , req.query).search().filter().pagination(resultPerPage)
        const products = await apiHelper.query;
        if(products.length === 0) return res.status(404).json({status:"failed" , msg : "No Products Found"})
        return res.json({status : "success" , products , productCount , totalPages , currentPage , resultPerPage})
    }
    catch(err){
        return res.status(500).json({status : "failed" , msg : err.message})
    }

}
// async function handleGetAllProducts(req, res) {
//     try {
//         const resultPerPage = 10;
        
//         // FIX 1: Run count calculation with a completely fresh, separate Mongoose clone instance query
//         const countHelper = new APIHelper(Product.find(), req.query).search().filter();
//         const productCount = await countHelper.query.countDocuments(); 
        
//         const totalPages = Math.ceil(productCount / resultPerPage);
//         const currentPage = Number(req.query.page) || 1;
        
//         if (totalPages > 0 && currentPage > totalPages) {
//             return res.status(404).json({ 'status': "failed", msg: "Page does not exist" });
//         }
        
//         // FIX 2: Dynamic pagination query standard execution block run
//         const apiHelper = new APIHelper(Product.find(), req.query).search().filter().pagination(resultPerPage);
//         const products = await apiHelper.query;
        
//         // FIX 3: Backend data mapping standards output response format fix
//         // If products are genuinely empty, return status 404 so error triggers beautifully
//         if (!products || products.length === 0) {
//             return res.status(404).json({ status: "failed", msg: "No Products Found" });
//         }
        
//         console.log("Products successfully fetched mapla:", products.length);
//         return res.status(200).json({ 
//             status: "success", 
//             products, 
//             productCount, 
//             totalPages, 
//             currentPage, 
//             resultPerPage 
//         });
//     }
//     catch (err) {
//         return res.status(500).json({ status: "failed", msg: err.message });
//     }
// }


//get product by id
async function handleGetProductById(req,res){
    const id = req.params.id;
    try{
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: "failed",
                msg: "Product not found"
            })
        }
        return res.status(200).json({status:"success" , product})
    }
    catch(err){
        return res.status(404).json({status:'failed' ,  msg : "Book not found"})
    }
}


//create new product
async function handleCreateNewProduct(req, res) {

    const { name, price, mrp, stock, description, category } = req.body;
    const productImage = req.files?.productImage; 

    if ( !name || !price || !mrp || !stock || !description || !category || !productImage) {
        return res.status(400).json({
            status: "failed",
            msg: "Please provide all product details"
        });
    }

    console.log(price , mrp)
    if(stock == 0){
        return res.status(400).json({status : 'failed' , msg : "Please enter valid stock count"})
    }
    else if(mrp == 0){
        return res.status(400).json({status : 'failed' , msg : "Please enter valid MRP"})
    }
    else if(price == 0){
        return res.status(400).json({status : 'failed' , msg : "Please enter valid Price"})
    }
    else if(Number(price) > Number(mrp)){
        return res.status(400).json({status : 'failed' , msg : "Selling Price should be lesser than MRP"})
    }


    try {
        const result = await cloudinary.uploader.upload(productImage.tempFilePath , {folder : 'ProductImages'})
        const product = await Product.create({
            name,
            price,
            mrp,
            stock,
            description,
            category,
            image : {
                public_id : result.public_id,
                url : result.secure_url
            },
            createdBy: req.user.id
        });

        return res.status(201).json({
            status: "success",
            msg: "Product Created Successfully",
            product
        });

    } catch (err) {
        return res.status(400).json({
            status: "failed",
            msg: err.message
        });
    }
}


//update product
async function handleUpdateProductById(req,res){
    const id = req.params.id;
    const product = await Product.findById(id)
    const productImage = req.files?.productImage
    const {name , price , category, stock , description , mrp} = req.body;
    const updateFields = {}
    if(productImage){
        const result = await cloudinary.uploader.upload(productImage.tempFilePath ,{folder : 'ProductImages'})
        if(product.image?.url){
            await cloudinary.uploader.destroy(product?.image?.public_id)
        }

        updateFields.image={
            public_id : result.public_id,
            url : result.secure_url
        }
    }
    if(name != "") updateFields.name = name
    if(price !== undefined) updateFields.price = price
    if(category != "") updateFields.category = category
    if(stock !== 0){
        updateFields.stock = stock
    } 
    if(mrp != 0) updateFields.mrp = mrp
    if(description != "") updateFields.description = description

    try{
        const product = await Product.findByIdAndUpdate(id, updateFields , {new : true  , runValidators : true})
        if(!product) return res.status(404).json({status : "failed" , msg : "Product not found"})
        return res.status(200).json({status : "success",product , msg: "Product successfully updated"})
    }
    catch(err){
        return res.status(400).json({status : "failed", msg :err.message})
    }
}

//delete product
async function handleDeleteProductById(req,res){
    const id = req.params.id;
    try{
        const deleteProduct = await Product.findByIdAndDelete(id)
        return res.status(200).json({status : "success" , msg : "Product deleted successfully"})
    }
    catch(err){
        return res.status(400).json({status: 'failed' , msg : err.message})
    }
}

//create review
async function createReview(req,res){
    const { rating , comment , productId } = req.body;
    if(!rating || !comment ||!productId){
        return res.status(400).json({status : "failed" , msg : "Please enter rating , comment and productId"})
    }

    const review = {
        user : req.user.id,
        username : req.user.username,
        avatar : req.user.avatar.url,
        rating :rating,
        comment : comment,
    }

    try{
        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({status : "failed" , msg : "Product not found"})
        }

        const reveiewExists = product.reviews.find((review)=> review.user == req.user.id)

        if(reveiewExists){
            product.reviews.forEach((review)=>{
                if(review.user.toString() == req.user.id){
                    review.rating = rating;
                    review.comment = comment;
                    review.avatar = req.user.avatar.url;
                    review.createdAt = Date.now()
                }
            })
        }
        else{
            product.reviews.push(review);
        }

        product.noOfReviews = product.reviews.length; 

        let sum = product.reviews.reduce((acc,review)=> acc + review.rating , 0);

        product.rating = product.noOfReviews > 0 ? sum / product.noOfReviews : 0;

        await product.save({validateBeforeSave : false});

        return res.status(200).json({status : "success" , msg : "Review added succesfully" , product})
    }
    catch(err){
        return res.status(500).json({status:"failed" , msg : err.message})
    }
}

async function viewReviews(req,res) {
    const id = req.query.id;
    try{
        const product = await Product.findById(id);
        if(!product){
            return res.status(404).json({status:"failed" , msg : "Product not found"})
        }

        return res.status(200).json({status:"success" , reviews : product.reviews})
    }
    catch(err){
        return res.status(500).json({status:"failed" , msg : err.message})
    }
}


async function deleteReview(req,res){
    const {productId} = req.query;
    const {reviewId } = req.query;
    if(!productId){
        return res.status(400).json({status:"failed" , msg : "ProductId not found"})
    }
    if(!reviewId){
        return res.status(400).json({status:"failed" , msg : "Review id not found"})
    }

    try{
        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({status:"failed" , msg : "Product not found"})
        }

        const isReviewFound = product.reviews.find((rev)=> rev._id.toString() === reviewId);
        if(!isReviewFound){
            return res.status(404).json({status:"failed" , msg : "Review not found"})
        }

        const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.reviewId)

        product.reviews = reviews;

        product.noOfReviews = product.reviews.length;

        let sum = product.reviews.reduce((acc , rev) => acc + rev.rating , 0);

        product.rating = product.noOfReviews > 0 ? sum / product.noOfReviews : 0;

        await product.save({validateBeforeSave : false});

        return res.status(200).json({status : "Success" , msg : "Review Deleted successfully" , product})

    }
    catch(err){
        return res.status(500).json({status:"failed" , msg : err.message})
    }
}


module.exports = { handleGetAllProducts , handleGetProductById , handleCreateNewProduct ,handleUpdateProductById , handleDeleteProductById,
    createReview , viewReviews,deleteReview

}