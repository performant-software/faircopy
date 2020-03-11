const preloadServices = require('./preload-services')

window.fairCopy = {
    rootComponent: "GraphWindow",
    electron: require("electron"),
    services: preloadServices.services
}