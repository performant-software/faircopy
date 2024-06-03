const fs = require("fs")
const os = require("os")
const JSZip = require('jszip')
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
    'fairCopy', 
    {
        rootComponent: 'WorkerWindow',
        getFs: () => {
            return "foo"
        },
        getOs: () => {
            return "bar"
        }
    }
)