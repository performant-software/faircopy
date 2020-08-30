#!/usr/bin/env node

const fs = require('fs');
// const csv = require('csvtojson');

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

const {parseSpecs} = require('./parse-specs');
const {createConfig} = require('./create-config')

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
    "note",
    "l"
]

const dramaEls = [
    // "actor",
    // "castGroup",
    // "castItem",
    // "castList",
    // "set",
    "sp",
    "speaker",
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
            validAttrs: [],
            desc: specs[phraseMark].description
        })
    }
    return phraseElements
}

function createExamplars(specs) {
    return [
        {
            "name": "div",
            "pmType": "node",
            "content": "(pLike|lLike|divLike|divPart)*",
            "group": "divLike",
            "validAttrs": [],
            "desc": specs['div'].description
        },
        {
            "name": "p",
            "pmType": "node",
            "content": "inline*",
            "group": "pLike",
            "gutterMark": true,
            "validAttrs": [],
            "desc": "marks paragraphs in prose."
        },
        {
            "name": "l",
            "pmType": "node",
            "content": "inline*",
            "group": "lLike",
            "gutterMark": true,
            "validAttrs": [],
            "desc": "(verse line) contains a single, possibly incomplete, line of verse."
        },
        {
            "name": "sp",
            "pmType": "node",
            "content": "speaker* (pLike|lLike)*",
            "group": "divPart",
            "gutterMark": true,
            "validAttrs": [],
            "desc": "(speech) contains an individual speech in a performance text, or a passage presented as such in a prose or verse text."
        },
        {
            "name": "speaker",
            "pmType": "node",
            "content": "inline*",
            "gutterMark": true,
            "validAttrs": [],
            "desc": "contains a specialized form of heading or label, giving the name of one or more speakers in a dramatic text or fragment."
        },
        {
            "name": "pb",
            "pmType": "inline-node",
            "validAttrs": [], 
            "desc": "marks the beginning of a new page in a paginated document."
        },
        {
            "name": "note",
            "pmType": "inline-node",
            "validAttrs": [], 
            "desc": "contains a note or annotation."
        }
    ]
}

function createAttributes( elements, specs ) {

    // for each element, add the attrs to its list of possible attrs
    const findAttrs = (specIdent) => {
        const elSpec = specs[specIdent]
        let elementAttrs = elSpec.attrs ? [ ...elSpec.attrs ] : []

        if( elSpec.memberships ) {
            for( const membership of elSpec.memberships ) {                
                elementAttrs = elementAttrs.concat( findAttrs( membership ) )
            }    
        }
        return elementAttrs
    }

    const attrDefs = {}

    // create a global dictionary of attr definitions and record attrs for each element
    for( const element of elements ) {
        const attrs = findAttrs(element.name)
        const validAttrs = []
        for( const attr of attrs ) {
            if( !attrDefs[attr.ident] ) {
                attrDefs[attr.ident] = attr
            }
            validAttrs.push( attr.ident )
        }
        element.validAttrs = validAttrs.sort()
    }

    // convert attr definitions into FairCopy data format
    const attrs = {}
    for( const attr of Object.values(attrDefs) ) {
        attrs[attr.ident] = {
            ...attr,
        }
    }

    // These attributes are treated specially
    attrs['xml:id'].hidden = true
    attrs['xml:base'].hidden = true

    return attrs
}

async function run() {
    const specs = load([ ...phraseMarks, ...examplarEls, ...dramaEls ])

    const elements = []

    elements.push(...createExamplars(specs))
    elements.push(...createPhraseElements(specs))

    const attrs = createAttributes(elements,specs)

    const teiSimpleConfig = { elements, attrs }
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