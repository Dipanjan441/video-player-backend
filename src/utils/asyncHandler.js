const asyncHandler = (reqHandler) => async(req, res, next) => {
    try {
        await reqHandler(req, res, next)
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        })
    }
} 