import dotenv from "dotenv";
import connectDB from './db/index.js';

dotenv.config({
    path: './env'
})


connectDB();

// (async()=>{
//     try{
//         await mongoose.connect(`${process.env.MOGODB_URL}/${DB_NAME}`)
//         app.on('error',(err)=> {
//             console.error('Application error',err)
//             throw err
//         })

//         app.listen(process.env.PORT,()=> {
//             console.log('app is running on port no',process.env.PORT);
//         })

//     } catch(err) {
//         console.error('error is',err)
//         throw err
//     }
// })()