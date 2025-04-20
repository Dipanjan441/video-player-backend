import {v2 as cloudinary} from "cloudinary";
import fs from "node:fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const fileUploadResponse = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        console.log("file uploaded successfully", fileUploadResponse);
        //fs.unlinkSync(localFilePath);
        await fs.promises.unlink(localFilePath)
        return fileUploadResponse;
    } catch (error) {
        // fs.unlinkSync(localFilePath);/
        await fs.promises.unlink(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary};