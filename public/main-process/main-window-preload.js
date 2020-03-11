
const preloadServices = require('./preload-services')

window.fairCopy = {
    rootComponent: "MainWindow",
    electron: require("electron"),
    services: preloadServices.services
}