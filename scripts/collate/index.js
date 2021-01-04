#!/usr/bin/env node
const fs = require('fs')
const Diff = require('diff')

function main() {    
    const one = fs.readFileSync(`temp/testcollation/damozel1855MS.txt`).toString('utf-8')
    const other = fs.readFileSync(`temp/testcollation/damozel18701st.txt`).toString('utf-8')

    const diff = Diff.diffWords(one, other)
    
    const out = []
    diff.forEach((part) => {
        // green for additions, red for deletions
        // grey for common parts
        const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
        out.push(`<span style="color: ${color}">${part.value}</span>`)
    });
    
    console.log(Diff.convertChangesToXML(diff))
}

///// RUN THE SCRIPT
main()