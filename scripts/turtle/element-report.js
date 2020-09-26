const fs = require('fs');

const {load} = require('./parse-specs')
const {createNodes,createStructureNodes} = require('./create-elements')
const {getAllElements} = require('./parse-util')

const runReport = async function runReport(teiSpecsDir) {
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


// EXPORTS /////////////
module.exports.runReport = runReport;
