const User = require('../models/userModel')
const bcrypt = require('bcryptjs');
const crypto = require("crypto")
const { sendEmail } = require('../mails/resetPassword')
const cloudinary = require('../config/cloudinary')
/*
function generateJwtToken(userId , role){
    return jwt.sign({userId , role} ,process.env.JWT_SECRET , {expiresIn : '10m'})
}
*/


//signup
async function handleSignUp(req,res){
    const {username , email , password , role} = req.body;
    const avatar = req.files?.avatar;
    if(!username || !email || !password || !avatar){
        return res.status(400).json({status : "Failed" , msg : "Please provide all details..."})
    }
    try{
        const isUser = await User.findOne({email : email.toLowerCase()});
        if(isUser) return res.status(400).json({status: "failed" , msg : "User already exists, Please Login"})


        //cloudinary upload
        const result = cloudinary.uploader.upload(
            avatar.tempFilePath, { folder : 'avatars' }
        )

        const newUser = await User.create({username , email , password , role , avatar: {
            public_id : (await result).public_id,
            url : (await result).secure_url
        }});

        const token = newUser.generateToken()
        
        res.cookie('token', token , {httpOnly : true});

        return res.status(201).json({success :"Registration successfull" , token , newUser , isAuthenticated : true})
    }
    catch(err){
        return res.status(500).json({status:"Failed" , msg : err.message})
    }
}


//login
async function handleLogin(req , res){
    const { email , password } = req.body;
    
    if(!email || !password){
        return res.status(400).json({status : "failed" , msg : "Please enter email and password"})
    }

    try{
        const isUser = await User.findOne({email : email.toLowerCase()}).select('+password')
        if(!isUser) return res.status(401).json({status:"Failed" , msg : "Enter valid email and password"})
        
        const isPass = await bcrypt.compare(password , isUser.password);
        if(!isPass) return res.status(400).json({status:"Failed" , msg : "Enter valid email and password"})

        const token = isUser.generateToken();
        
        const loggedUser = isUser.toObject();
        delete loggedUser.password

        
        return res.status(200).cookie('token' , token , {httpOnly : true}).json({success : "Login successfull", msg : "Login successfull" , token , loggedUser})
    }
    catch(err){
        return res.status(500).json({status : "Failed", msg : err.message})
    }
}


//get profile
const handleGetProfile = async(req,res)=>{
    try{
        const user = await User.findById(req.user.id).select('-password')
        if(!user) return res.status(404).json({status : "failed" , msg : "User not found"});

        return res.status(200).json({status : "success" , profile : user})
    }
    catch(err){
        return res.status(500).json({status : "failed" , msg : err.message})
    }
}

//update profile
const handleUpdateProfile = async(req,res)=>{
    try{
        const user = await User.findById(req.user.id);
        
        const {username , email} = req.body
        const avatar = req.files?.avatar;

        if(!user) return res.status(404).json({status : "failed" , msg : "User not found"});

        const updateFields = {}

        if(avatar){

            //add to cloudinary
            const result = await cloudinary.uploader.upload(avatar.tempFilePath , { folder : "avatars"})

            //delete old avatar
            if(user?.avatar?.public_id){
                await cloudinary.uploader.destroy(user.avatar.public_id)
            }

            updateFields.avatar = {
                public_id : result.public_id,
                url : result.secure_url
            }
        }

        if(username) updateFields.username= username;
        if(email) updateFields.email= email;
        
        const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields  , {new : true , runValidators :true})
        if(!updatedUser){
            return res.status(400).json({status:"failed" , msg : "Please enter valid details"})
        }
        return res.status(200).json({status : "success" , msg : "Profile Updated successful" , updatedUser})
    }
    catch(err){
        return res.status(400).json({status:"failed" , err : err.message})
    }
}

//forgot password
const handleForgotPassword = async (req,res)=>{
    const {email} = req.body;
    if(!email) return res.status(400).json({status:"failed" , msg : "Please enter Email"})

    const user = await User.findOne({email});
    if(!user) return res.status(404).json({status:"failed" , msg : "User not found"})

    let resetToken ;

    try{
        resetToken = user.generateResetPasswordToken()
        await user.save({validateBeforeSave : false})
        // res.status(200).json({status:"success" , msg : "Reset token generated"})
    }
    catch(err){
        return res.status(500).json({status:"failed" , msg : err.message})
    }

    const resetPassURL = `${process.env.FRONTEND_URL}/reset/${resetToken}`;
    console.log(resetPassURL)
    const resetPassMsg = `Your password reset link is below : \n${resetPassURL}\nThe link is expire in 30mins.`

    try{
        await sendEmail({email: user.email , subject : "Reset Password Request" , message : resetPassMsg})
        return res.status(200).json({status:"success" , msg:`Mail suuccessfully send to ${user.email}`})
    }
    catch(err){
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire= undefined;
        await user.save({validateBeforeSave : false})
        return res.status(500).json({status : "failed" , msg : err.message})
    }
}   

//resetpassword
const handleResetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const { newPassword , confirmNewPassword } = req.body;
    
    try{
        if(!newPassword || !confirmNewPassword) return res.status(400).json({status : "failed" , msg : "Please enter all fields"})

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                status: "failed",
                msg: "Passwords do not match"
            });
        }

        const user = await User.findOne({resetPasswordToken , resetPasswordExpire : {$gt : Date.now()}})

        if(!user){
            return res.status(400).json({status : "failed" , msg : "Reset Link Expired, Try again"})
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({validateBeforeSave :true});
        return res.status(200).json({status : "success" , msg : "Password reset successfully"})
    }
    catch(err){
        return res.status(500).json({status: "failed" , msg : err.message})
    }
};


//logout
const handleLogout = async(req,res)=>{

    try{
        const user = await User.findById(req.user.id);
        return res.clearCookie('token' , {httpOnly : true}).json({status:"success" , msg : `Logout user ${user.username} successfully`})
    }
    catch(err){
        return res.status(400).json({status:"failed" , msg : `Cannot Logout` , err : err.message})
    }
}


//update passoword
const updatePassword = async (req,res) => {
    const { oldPassword , newPassword , confirmPassword } = req.body;
    if(!oldPassword || !newPassword || !confirmPassword){
        return res.status(400).json({status :"Failed", msg : "Please enter all fields"})
    }
    try{
        const user = await User.findById(req.user.id).select('+password');
        const isPassword = await bcrypt.compare(oldPassword , user.password)
        const isSamePass = await bcrypt.compare(newPassword , user.password)

        if(!isPassword){
            return res.status(400).json({status :"Failed", msg : "Incorrect old password"})
        }

        if(isSamePass){
            return res.status(400).json({status :"Failed", msg : "Your password is same as previous password"})
        }

        if(newPassword !== confirmPassword){
            return res.status(400).json({status :"Failed", msg : "New password and confirm password must be same"})
        }
        user.password = newPassword;
        await user.save({validateBeforeSave : true})
        const token = user.generateToken()

        const updatedUser = user.toObject()
        delete updatedUser.password

        return res.status(200).cookie('token' , token , {httpOnly : true}).json({status : "success" , msg : "Password Update Successfully" , updatedUser})
    }catch(err){
        res.status(500).json({status :"failed" , msg : err.message})
    }
}



//get all users
async function hanldeGetAllUsers(req,res){
    try{
        const users = await User.find().select('-password');
        if(users.length === 0) return res.status(200).json({msg : "no users found"})
        return res.status(200).json({status : "Success" , users})
    }
    catch(err){
        return res.status(404).json({status : "failed" , msg : err.message})
    }
}


//get sigle user
async function getSingleUser(req,res){
    try{
        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(404).json({status : "failed" , msg : "user not found"})
        }
        return res.status(200).json({status : "success" , user})
    }
    catch(err){
        return res.status(500).json({status : "failed" , msg : err.message})
    }
}


//delete user
async function deleteUser(req,res){
    try{
        await User.findByIdAndDelete(req.params.id);
        return res.status(200).json({status : "success" ,msg : `User deleted successfully`})
    }
    catch(err){
        return res.status(400).json({status : "failed" ,msg : `User not found`})
    }
}

//update user role 
async function updateUserRole(req,res){
    const {role} = req.body;
    if(!role){
        return res.status(400).json({status : "failed" ,msg : `Please enter role`})
    }
    const updateFields  = {role};
    const id = req.params.id;

    try{
        const user = await User.findByIdAndUpdate(id , updateFields , {returnDocument : 'after' , runValidators : true});
        if(!user){
            return res.status(400).json({status : "failed" ,msg : `User not found`})
        }
        return res.status(200).json({status : "success" ,msg : `User role updated successfully` , user})
    }
    catch(err){
        return res.status(500).json({status : "failed" ,msg : err.message})
    }
}

module.exports = {
    handleSignUp,
    hanldeGetAllUsers,
    handleLogin,
    handleGetProfile,
    handleUpdateProfile,
    handleForgotPassword,
    handleResetPassword,
    handleLogout,
    updatePassword,
    getSingleUser,
    deleteUser,
    updateUserRole
}