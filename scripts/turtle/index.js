#!/usr/bin/env node

const fs = require('fs');
// const csv = require('csvtojson');

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

const {parseSpecs} = require('./parse-specs');

// const teiSimplePrintODD = 'scripts/tei_simplePrint.odd'

const phraseMarks = [
    "ref",
    "name",
    "rs",
    "num",
    "measure",
    "time",
    "date",
    "email",
    "expan",
    "abbr",
    "orig",
    "supplied",
    "corr",
    "reg",
    "unclear",
    "del",
    "sic",
    "add",
    "term",
    "foreign",
    "title",
    "hi",
    "rhyme",
    "seg",
    "s",
    "measure"
]

const examplarEls = [
    "div",
    "p",
    "pb",
    "note"
]

const dramaEls = [
    // "actor",
    // "castGroup",
    // "castItem",
    // "castList",
    // "set",
    "sp",
    // "speaker",
    // "stage",
    // "role",
    // "roleDesc"
]


// load simple file, locate body els, make a list of their modules
// function loadTEISimpleElements() {
//     const teiSimpleXML = fs.readFileSync(teiSimplePrintODD, "utf8")
//     const simpleDOM = new JSDOM(teiSimpleXML, { contentType: "text/xml" })
//     const xmlDoc = simpleDOM.window.document;

//     // really need xpath here
//     const specGroups = xmlDoc.getElementsByTagName('specGrp');
//     const specEls = specGroups[4].childNodes;
//     const moduleNames = []

//     for (let i = 0; i < specEls.length; i++) {
//         const specEl = specEls[i]
//         if( specEl.localName === 'elementRef') {
//             moduleNames.push( specEl.getAttribute('key') )    
//         }
//     }

//     return moduleNames
// }

function load(elementIdents) {
    const specs = {}

    // recursively load module dependencies
    // assumes 1-1 spec files to specifications
    const loadSpec = (specName) => {
        if( !specs[specName] ) {
            const specPath = `${teiSpecsDir}/${specName}.xml`
            const moduleSpecs = parseSpecs(specPath)
            for( const moduleSpec of moduleSpecs ) {
                specs[moduleSpec.ident] = moduleSpec
                if( moduleSpec.memberships ) {
                    for( const membership of moduleSpec.memberships ) {
                        loadSpec(membership)
                    }                    
                }
                // TODO resolve attrRefs
            }
        }
    }

    // load the element specs and their dependencies
    for( const elementIdent of elementIdents ) {
        loadSpec(elementIdent)
    }

    return specs
}

function createPhraseElements(specs) {
    const phraseElements = []
    for( let phraseMark of phraseMarks) {
        phraseElements.push({
            name: phraseMark,
            pmType: "mark",
            defaultAttrs: [],
            desc: specs[phraseMark].description
        })
    }
    return phraseElements
}

function createDramaElements(specs) {
    return [{
        "name": "sp",
        "pmType": "node",
        "content": "chunk*",
        "group": "block",
        "defaultAttrs": [],
        "desc": specs['sp'].description
    }]
}

function createExamplars(specs) {
    return [
        {
            "name": "div",
            "pmType": "node",
            "content": "(chunk|block)*",
            "group": "block",
            "defaultAttrs": [],
            "desc": specs['div'].description
        },
        {
            "name": "p",
            "pmType": "node",
            "content": "inline*",
            "group": "chunk",
            "defaultAttrs": [],
            "desc": "marks paragraphs in prose."
        },
        {
            "name": "pb",
            "pmType": "inline-node",
            "defaultAttrs": [],
            "desc": "marks the beginning of a new page in a paginated document."
        },
        {
            "name": "note",
            "pmType": "inline-node",
            "defaultAttrs": [],
            "desc": "contains a note or annotation."
        }
    ]
}

function createAttributes( elements, specs ) {

    // for each element, add the attrs to its list of possible attrs
    const findAttrs = (specIdent) => {
        const elSpec = specs[specIdent]
        const elementAttrs = elSpec.attrs ? [ ...elSpec.attrs ] : []

        if( elSpec.memberships ) {
            for( const membership of elSpec.memberships ) {                
                elementAttrs.concat( findAttrs( membership ) )
            }    
        }
        return elementAttrs
    }

    const attrDefs = {}

    // create a global dictionary of attr definitions and record attrs for each element
    for( const element of elements ) {
        const attrs = findAttrs(element.name)
        for( const attr of attrs ) {
            if( !attrDefs[attr.ident] ) {
                attrDefs[attr.ident] = attr
            }
            element.defaultAttrs.push( attr.ident )
        }
    }

    // convert attr definitions into FairCopy data format
    const attrs = {}
    for( const attr of Object.values(attrDefs) ) {
        attrs[attr.ident] = {
            type: 'text'
        }
    }

    return attrs
}

async function run() {
    const specs = load([ ...phraseMarks, ...examplarEls, ...dramaEls ])

    const elements = [], vocabs = {}

    elements.push(...createExamplars(specs))
    elements.push(...createPhraseElements(specs))
    elements.push(...createDramaElements(specs))

    const attrs = createAttributes(elements,specs)

    const teiSimpleConfig = { elements, attrs, vocabs }
    fs.writeFileSync("config/tei-simple.json",JSON.stringify(teiSimpleConfig))
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