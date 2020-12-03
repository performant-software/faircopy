const fs = require('fs');

const {load} = require('./parse-specs')
const {createElements} = require('./create-elements')
const {getAllElements} = require('./parse-util')

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

const runReport = async function runReport() {
    const elementGroups = JSON.parse(fs.readFileSync(`scripts/turtle/exp-element-groups.json`).toString('utf-8'))
    const allElements = getAllElements(elementGroups)
    const specs = load( teiSpecsDir, allElements )

    const elements = createElements(elementGroups,specs)

    const reportRows = []
    for( const element of elements ) {
        const { name, content, group, pmType } = element
        if( pmType === 'node' || pmType === 'inline-node' ) {
            reportRows.push(`${name}:${content}:${group}`)    
        }
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