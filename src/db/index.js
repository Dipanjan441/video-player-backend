import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { app } from "../app.js";

const connectDB = async()=> {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MOGODB_URL}/${DB_NAME}`);
        console.log("DB connected, DB hosted : ",connectionInstance.connection.host);
        app.on('error',(error)=>{
            console.log("Application error",error);
        })
    } catch(error) {
        console.log("DB Connection Failed",error);
        process.exit(1);
    }
}

export default connectDB;