#!/usr/bin/env node

const fs = require('fs');

const {load} = require('./parse-specs')
const {createConfig} = require('./create-config')
const {createElements,createNodes,createStructureNodes} = require('./create-elements')
const {createAttributes} = require('./create-attributes')

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'
// const teiSimplePrintODD = 'scripts/tei_simplePrint.odd'

function getAllElements(elementGroups) {
    const allElements = []
    for( const elementGroup of Object.values(elementGroups) ) {
        for( const ident of elementGroup ) {
            allElements.push(ident)
        }
    }
    return allElements
}

async function run() {
    const elementGroups = JSON.parse(fs.readFileSync(`scripts/turtle/element-groups.json`).toString('utf-8'))
    const allElements = getAllElements(elementGroups)
    const specs = load( teiSpecsDir, allElements )

    const elements = createElements(elementGroups,specs)
    const attrs = createAttributes(elements,specs)

    const teiSimpleConfig = { elements, attrs }
    fs.writeFileSync("public/main-process/config/tei-simple.json",JSON.stringify(teiSimpleConfig, null, '\t'))

    // new project config is based on schema
    const fairCopyConfig = createConfig(teiSimpleConfig)
    fs.writeFileSync("public/main-process/config/faircopy-config.json",JSON.stringify(fairCopyConfig, null, '\t'))
}

// run report for determining how to categorize TEI elements
async function runReport() {
    const elementGroups = JSON.parse(fs.readFileSync(`scripts/turtle/exp-element-groups.json`).toString('utf-8'))
    const allElements = getAllElements(elementGroups)
    const specs = load( teiSpecsDir, allElements )

    // treat marks as nodes so we can get all their group and content data
    elementGroups.nodes = elementGroups.nodes.concat(elementGroups.marks)
    elementGroups.marks = []

    // create a table of the name, content, and group data
    const elements = [...createNodes(elementGroups,specs), ...createStructureNodes(elementGroups,specs)]
    const reportRows = []
    for( const element of elements ) {
        const { name, content, group, pmType } = element
        if( pmType === 'node' ) {
            reportRows.push(`${name}:${content}:${group}`)    
        }
    }    

    // export as CSV
    fs.writeFileSync("temp/tei-report.csv",reportRows.join('\n'))
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