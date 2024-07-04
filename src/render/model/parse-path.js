// Return the name of the resource based on the file path, minus the extension
export function getPathBasename(path) {
    const normalized = path.replaceAll('\\','/')
    const withoutExt = normalized.replace(/\..*$/,'')
    const lastSlash = withoutExt.lastIndexOf('/')
    return lastSlash > 0 ? withoutExt.substr(lastSlash+1) : withoutExt
}