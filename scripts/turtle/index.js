#!/usr/bin/env node

const fs = require('fs');

const {load} = require('./parse-specs')
const {createConfig} = require('./create-config')
const {createElements} = require('./create-elements')
const {createModules} = require('./create-modules')
const {createAttributes} = require('./create-attributes')
const {getAllElements} = require('./parse-util')

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

async function run() {
    const elementGroups = JSON.parse(fs.readFileSync(`scripts/turtle/element-groups.json`).toString('utf-8'))
    const allElements = getAllElements(elementGroups)
    const specs = load( teiSpecsDir, allElements )

    const elements = createElements(elementGroups,specs)
    const attrs = createAttributes(elements,elementGroups,specs)
    const modules = createModules(allElements,specs)

    const teiSimpleConfig = { elements, attrs, elementGroups, modules }
    fs.writeFileSync("public/main-process/config/tei-simple.json",JSON.stringify(teiSimpleConfig, null, '\t'))

    // new project config is based on schema
    const fairCopyConfig = createConfig(teiSimpleConfig)
    fs.writeFileSync("public/main-process/config/faircopy-config.json",JSON.stringify(fairCopyConfig, null, '\t'))
}

// A wise turtle that understands ODD and ProseMirror
function main() {
    run().then(() => {
        console.log('Done!')
    }, (err) => {
        console.log(`${err}: ${err.stack}`)  
    });
}

///// RUN THE SCRIPT
main()