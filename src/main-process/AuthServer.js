const http = require('http')
const { shell } = require('electron')

class AuthServer {
    constructor(port = 3847) {
        this.port = port
        this.server = null
        this.pendingResolve = null
    }

    decodeToken(tokenStr) {
        return JSON.parse(atob(tokenStr.split('.')[1]))
    }

    start(serverUrl) {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://localhost:${this.port}`)
                const tokenStr = url.searchParams.get('token')
                const token = tokenStr
                    ? this.decodeToken(tokenStr)
                    : null
                
                if (token) {
                    res.writeHead(200, { 'Content-Type': 'text/html' })
                    res.end('<html><body><h1>Authentication successful!</h1><p>You may close this window and return to FairCopy.</p></body></html>')
                    
                    if (this.pendingResolve) {
                        this.pendingResolve({ token })
                    }
                    
                    setTimeout(() => this.stop(), 500)
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' })
                    res.end('<html><body><h1>Authentication failed</h1></body></html>')
                }
            })

            const callbackURL = `http://localhost:${this.port}/callback`
            const authURL = `${serverUrl}/faircopy_login?redirect=${encodeURIComponent(callbackURL)}`
            shell.openExternal(authURL)

            this.server.listen(this.port, () => {
                console.log(`Auth server listening on port ${callbackURL}`)
                resolve()
            })

            this.server.on('error', reject)
        })
    }

    stop() {
        if (this.server) {
            this.server.close()
            this.server = null
            console.log('Auth server stopped')
        }
    }

    waitForToken() {
        return new Promise((resolve) => {
            this.pendingResolve = resolve
        })
    }
}

exports.AuthServer = AuthServer