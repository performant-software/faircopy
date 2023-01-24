import { logout } from "./auth"

// a standard function for passing on error responses
export function standardErrorHandler(userID,serverURL,onFail) {
    return (errorResponse) => {
        if( errorResponse && errorResponse.response ) {
            const { error } = errorResponse.response.data
            const notAuthorized = (errorResponse.response.status === 401 )
            if( notAuthorized ) {
                // user is either logged out on server or is making unauthorized requests
                logout(userID,serverURL)
            }
            onFail( error )
        } else {
            onFail("Unable to connect to server.")
        }
    }
}