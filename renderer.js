
var { EditorWindow } = require('./renderer-process/EditorWindow')
let editorWindow = new EditorWindow()

console.log( `We are using Node.js ${process.versions.node}`)
console.log( `Chromium ${process.versions.chrome}`)
console.log( `and Electron ${process.versions.electron}`)
