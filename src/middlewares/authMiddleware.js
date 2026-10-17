const jwt = require('jsonwebtoken')
const User = require('../models/userModel');


const authVerify = async(req,res,next)=>{
    const {token} = req.cookies;

    if(!token) {
        return res.status(401).json({msg : "Token expired , Please Login"})
    }

    try{
        const decodedUser = jwt.verify(token , process.env.JWT_SECRET);
        req.user = decodedUser
        next();
    }
    catch(err){
        return res.status(401).json({msg: 'Invalid or expired token'})
    }
}


const adminCheck = async (req,res,next)=>{  
    if(req.user && req.user.role === 'admin'){
        return next()
    }
    else{
        res.status(403).json({status :"Failed" , msg :"Access denied , admin access required "})
    }
}


module.exports= {authVerify , adminCheck}