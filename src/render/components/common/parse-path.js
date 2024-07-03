export function getPathBasename(path) {
    // return the basename of the file without its extension
    return path.substring(path.lastIndexOf('/')+1);
}