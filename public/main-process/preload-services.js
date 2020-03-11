const fs = require('fs')

const readFileSync = function readFileSync(filePath) {
    return fs.readFileSync(filePath, "utf8")
}

const writeFileSync = function writeFileSync(filePath, contents) {
    fs.writeFileSync(filePath, contents, (err) => {
        if (err) {
            console.log(err)
        } 
    })
}

exports.services = { readFileSync, writeFileSync }