const fs = require('fs');

const {load} = require('./parse-specs')
const {createElements} = require('./create-elements')
const {getAllElements} = require('./parse-util')

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

const runReport = async function runReport() {
    const elementGroups = JSON.parse(fs.readFileSync(`scripts/turtle/element-groups.json`).toString('utf-8'))
    const allElements = getAllElements(elementGroups)
    const specs = load( teiSpecsDir, allElements )

    const elements = createElements(elementGroups,specs,true)

    const reportRows = []
    for( const element of elements ) {
        const { name, content, allContent, markContent, inlineContent, group, pmType } = element
        reportRows.push(`${name}:${pmType}:${allContent}:${content}:${group}:${markContent}:${inlineContent}`)    
    }    

    // export as CSV
    fs.writeFileSync("temp/tei-report.csv",reportRows.join('\n'))
}

// Run the report
function main() {
    runReport().then(() => {
        console.log('Done!')
    }, (err) => {
        console.log(`${err}: ${err.stack}`)  
    });
}

///// RUN THE SCRIPT
main()