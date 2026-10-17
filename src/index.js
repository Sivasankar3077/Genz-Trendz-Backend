const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const path = require('path')
const fileUpload = require('express-fileupload')

const app = express()


dotenv.config({path:path.join(__dirname,'config','config.env')})

//cloudinary
const cloudinary = require('./config/cloudinary')

//routes
const productRoutes = require('./routes/productRoutes')
const userRoutes = require('./routes/userRoutes')
const orderRoutes = require('./routes/orderRoutes')
const paymentRoutes = require('./routes/paymentRoute')

//env variables
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;


app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp/"
    }))
app.use(cookieParser())

//routes
app.use('/api' , productRoutes)
app.use('/api/auth' , userRoutes)
app.use('/api' , orderRoutes)
app.use('/api/payment', paymentRoutes)

mongoose.connect(MONGO_URI).then(()=> console.log("MongoDb connected..")).catch(err=> console.log(err.message))

app.listen(PORT, ()=>console.log(`Server listening at port ${PORT}`))