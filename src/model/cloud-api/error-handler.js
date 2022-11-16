// a standard function for passing on error responses

export function standardErrorHandler(onFail) {
    const errorHandler = (errorResponse) => {
        if( errorResponse && errorResponse.response ) {
            if( errorResponse.response.status === 401 ) {
                const { error } = errorResponse.response.data
                onFail(error)        
            }
        } else {
            onFail("Unable to connect to server.")
        }
    }
    return errorHandler
}

