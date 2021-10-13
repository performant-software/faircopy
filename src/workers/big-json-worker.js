
export function bigJSON( msg, postMessage ) {
    const { command, resourceID, data } = msg
    
    switch( command ) {
        case 'parse':
            postMessage({ messageType: 'json', resourceID, respData: JSON.parse(data) })    
            break
        case 'stringify':
            postMessage({ messageType: 'string', resourceID, respData: JSON.stringify(data) })    
            break
        default:
            throw new Error(`Unrecognized command to big json worker ${command}.`)
    }
}