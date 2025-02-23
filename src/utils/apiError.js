class ApiError extends Error {
    constructor(
        statusCode,
        message = "SOmething went wrong",
        error = [],
        stack = ""
    ){
        super(message);
        this.status = statusCode
        this.success = false
        this.error = error
    }
}

export {ApiError}