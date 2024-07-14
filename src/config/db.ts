import mongoose, { Document } from "mongoose";

const connectDB=async()=>{
    try{
        const mongoUrl = process.env.MONGO_URL;
        if (!mongoUrl) {
            throw new Error("MONGO_URL is not defined");
        }

        const conn=await mongoose.connect(mongoUrl);
        console.log(`Connected to MongoDb ${conn.connection.host}`);
    }
    catch(error){
        console.log(`Error in MongoDb is ${error}`)
    }
}

export default connectDB;