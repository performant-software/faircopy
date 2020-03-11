const preloadServices = require('./preload-services')

window.fairCopy = {
    rootComponent: "NoteWindow",
    electron: require("electron"),
    services: preloadServices.services
}