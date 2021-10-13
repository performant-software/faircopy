
const preloadServices = require('./preload-worker-services')

window.fairCopy = {
    rootComponent: "WorkerWindow",
    services: preloadServices.services
}