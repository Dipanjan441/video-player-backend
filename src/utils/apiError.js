class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message);
        this.status = statusCode
        this.success = false
        this.error = errors
        this.data = null
    }
}

export {ApiError}