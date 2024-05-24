
const preloadServices = require('./preload-worker-services')
const JSZip = require('jszip');
preloadServices.services.JSZip = JSZip

window.fairCopy = {
    rootComponent: "WorkerWindow",
    services: preloadServices.services
}