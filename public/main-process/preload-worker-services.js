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

exports.services = { 
    getElectron,
    getFs,
    getOs
}