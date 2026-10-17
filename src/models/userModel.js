const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const userSchema= mongoose.Schema({
    username : {
        type:String,
        required : [true , 'Please enter username']
    },
    email : {
        type : String,
        required : [true , "Please enter email"],
        unique: true,
        lowercase : true
    },
    password : {
        type : String,
        required : [true , "Please enter password"],
        minLength : [7 , "Password must be atleast 7 characters"],
        select:false
    },

    avatar : {
        public_id : {
            type : String,
            required : true,
            default : "temp_id"
        },
        url : {
            type  : String,
            required : true
        }
    },

    createdAt : {
        type : Date,
        required : true,
        default : Date.now
    },
    role : {
        type : String,
        required : [true , 'Please enter role'],
        enum : ['user' , 'admin'],
        default : 'user'
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
    resetPasswordToken : String,
    resetPasswordExpire : Date

});

userSchema.pre('save' , async function(){
    if(!this.isModified("password")){
        return;
    }
    this.password = await bcrypt.hash(this.password , 10)
})

userSchema.methods.generateToken = function(){
    return jwt.sign({id:this._id , role : this.role , username:this.username , avatar : this.avatar} , process.env.JWT_SECRET , {expiresIn : '2d'});
}

userSchema.methods.generateResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000 ; 
    return resetToken; 
}


const User = mongoose.model("user",userSchema);

module.exports= User;