// Return the name of the resource based on the file path, minus the extension
function getPathBasename(path) {
    const normalized = path.replaceAll('\\','/')
    const withoutExt = normalized.replace(/\..*$/,'')
    const lastSlash = withoutExt.lastIndexOf('/')
    return lastSlash > 0 ? withoutExt.substr(lastSlash+1) : withoutExt
}

describe('test getPathBasename()', () => {
    test('foo', () => {
        const path = 'foo'
        const name = getPathBasename(path)
        expect(name).toBe('foo')
    })
    test('foo.txt', () => {
        const path = 'foo.txt'
        const name = getPathBasename(path)
        expect(name).toBe('foo')
    })
    test('bob/has/foo.txt', () => {
        const path = 'bob/has/foo.txt'
        const name = getPathBasename(path)
        expect(name).toBe('foo')
    })
    test('bob\\has\\foo.txt', () => {
        const path = 'bob\\has\\foo.txt'
        const name = getPathBasename(path)
        expect(name).toBe('foo')
    })
})