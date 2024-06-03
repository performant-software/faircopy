import React from 'react';
import ReactDOM from 'react-dom';
import App from './render/components/App';

const electron = require("electron")
const fs = require("fs")
const os = require("os")

const getElectron = function getElectron() {
    return electron
}

const getFs = function getFs() {
    return fs
}

const getOs = function getOs() {
    return os
}

const JSZip = require('jszip');

window.fairCopy = {
    rootComponent: "WorkerWindow",
    services: { 
        getElectron,
        getFs,
        getOs,
        JSZip
    }
}

ReactDOM.render(<App/>, document.getElementById('root'));