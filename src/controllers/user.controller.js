import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { isValidEmail } from "../utils/validation.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating token");
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    //take the user input from frontend
    const { userName, email, fullName, password } = req.body;

    //validation
    if ([userName, email, fullName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All mandatory fields are required");
    } else if (!isValidEmail(email)) {
        throw new ApiError(400, "Please enter a valid email");
    }

    //duplicate entry check
    const duplicateUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (duplicateUser) {
        throw new ApiError(409, "User name and Email already exist, it should be unique")
    }

    //file upload
    console.log("files", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatart image is required")
    }
    //mandatory avatar file upload in cloundinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Something went wrong while uploading avatar image into server");
    }
    //optional coverImage file upload in cloudinary
    let coverImage = null;
    if (coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) {
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
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    //send structured response
    return res.status(201).json(
        new ApiResponse(201, createdUser, `${user._id} created successfuly`)
    )
})

export const loginUser = asyncHandler(async (req, res) => {
    //access the req body
    const { userName, email, password } = req.body;
    if (!userName && !email) {
        throw new ApiError(400, "Username or email is required for login");
    }
    //checkif the user exist
    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if (!user) {
        throw new ApiError(404, "Username or email doesn't exist");
    }
    //check password
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(404, "Password is incorrect");
    }
    //generate access & refreshtoken
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedUser = await User.findById(user._id).select("-paasword -refreshToken");
    //set cookies
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

export const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    //reset cookies
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Successfully logout"))
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);
    if (!user) {
        throw new ApiError(401, "Invalid RefreshToken");
    }
    if (incommingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Your Refresh token is expired");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true
    }
    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(200,
            { accessToken, refreshToken },
            "Access Token refreshed"
        )
})

export const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old Password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
        .status(200)
        .json(200, {}, "Password is updated successfully");
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(404, "User is not avaialble")
    }
    return res
        .status(200)
        .json(200, req.user, "User fetched successfully");
})

export const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(404, "Email or Fullname is mandatory");
    }

    const newUser = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                fullName,
                email
            },

        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(200,newUser,"User details are updated successfully")
})

export const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is mandatory");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) {
        throw new ApiError(500,"Something went wrong while uploading avatar in cloudinary");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(200,updatedUser,"User Avatar has been updated successfully");
})

export const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400,"Cover Image file is mandatory");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url) {
        throw new ApiError(500,"Something went wrong while uploading cover image in cloudinary");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(200,updatedUser,"User Cover Image has been updated successfully");
})