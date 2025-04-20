import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { isValidEmail } from "../utils/validation.js";

export const registerUser = asyncHandler(async(req,res)=>{
    //take the user input from frontend
    const {userName, email,fullName, password} = req.body;

    //validation
    if([userName,email,fullName,password].some((field)=> field?.trim() === "") ) {
        throw new ApiError(400,"All mandatory fields are required");
    } else if(!isValidEmail(email)){
        throw new ApiError(400,"Please enter a valid email");
    }

    //duplicate entry check
    const duplicateUser = await User.findOne({
        $or: [{userName},{email}]
    })
    if(duplicateUser) {
        throw new ApiError(409,"User name and Email already exist, it should be unique")
    }

    //file upload
    console.log("files",req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatart image is required")
    }
    //mandatory avatar file upload in cloundinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        throw new ApiError(500,"Something went wrong while uploading avatar image into server");
    }
    //optional coverImage file upload in cloudinary
    let coverImage = null;
    if(coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if(!coverImage) {
            throw new ApiError(500, "Something went wrong while uploading coverImage into server")
        }
    }

    //user creation in db
    const user = await User.create({
        userName,
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || null,
        password
    });
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user");
    }

    //send structured response
    return res.status(201).json(
        new ApiResponse(201,createdUser,`${user._id} created successfuly`)
    )

    // console.log("username",userName);
    
    // res.status(200).json({
    //     message: "ok"
    // })
})