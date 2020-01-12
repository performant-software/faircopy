#!/usr/bin/env node

const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
// const csv = require('csvtojson');

const teiSimplePrintODD = 'scripts/tei_simplePrint.odd'

// this is https://github.com/TEIC/TEI
const teiSpecsDir = '../TEI/P5/Source/Specs'

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
function loadModuleNames() {
    const teiSimpleXML = fs.readFileSync(teiSimplePrintODD, "utf8")
    const simpleDOM = new JSDOM(teiSimpleXML, { contentType: "text/xml" })
    const xmlDoc = simpleDOM.window.document;

    // really need xpath here
    const specGroups = xmlDoc.getElementsByTagName('specGrp');
    const specEls = specGroups[4].childNodes;
    const moduleNames = []

    for (let i = 0; i < specEls.length; i++) {
        const specEl = specEls[i]
        if( specEl.localName === 'elementRef') {
            moduleNames.push( specEl.getAttribute('key') )    
        }
    }

    return moduleNames
}

function loadModule( moduleName ) {
    const moduleFile = `${teiSpecsDir}/${moduleName}.xml`
    const moduleXML = fs.readFileSync(moduleFile, "utf8")
    const simpleDOM = new JSDOM(moduleXML, { contentType: "text/xml" })
    const xmlDoc = simpleDOM.window.document;

    const getKeys = (el,keyTag) => {
        const keys = []
        const tags = el ? el.getElementsByTagName(keyTag) : []

        for (let i = 0; i < tags.length; i++) {
            const tagEl = tags[i]
            if( keyTag === tagEl.localName )  {
                const key = tagEl.getAttribute('key')
                if( !key.startsWith('att.') ) {
                    keys.push( key )    
                }
            }
        } 
        return keys   
    }

    const classesEl = xmlDoc.getElementsByTagName('classes')[0]
    const memberships = getKeys(classesEl,'memberOf')

    const contentEl = xmlDoc.getElementsByTagName('content')[0]
    const refs = [ 
        ...getKeys(contentEl,'classRef'),
        ...getKeys(contentEl,'elementRef'),
        ...getKeys(contentEl,'macroRef') 
    ]

    let description = ""
    const descEls = xmlDoc.getElementsByTagName('desc')
    for( let i=0; i < descEls.length; i++ ) {
        const desc = descEls[i]
        if( desc.getAttribute("xml:lang") === "en" ) {
            // TODO flatten out newlines and runs of whitespace
            description = desc.innerHTML
        }
    }

    return { name: moduleName, memberships, refs, description }
}

function load() {
    const modules = {}

    // recursively load module dependencies
    const loadDependencies = (mod) => {
        const deps = mod.memberships.concat( mod.refs )
        for( const dep of deps ) {
            if( !modules[dep] ) {
                const mod = loadModule(dep)
                modules[dep] = mod
                loadDependencies(mod)
            }
        }
    }

    const moduleNames = loadModuleNames()
    for( const moduleName of moduleNames ) {
         const mod = loadModule(moduleName)
         modules[moduleName] = mod
         loadDependencies(mod)
    }

    return modules
}

function createPhraseElements(modules) {
    const specs = []
    for( let phraseMark of phraseMarks) {
        specs.push({
            name: phraseMark,
            pmType: "mark",
            defaultAttrs: [],
            desc: modules[phraseMark].description
        })
    }
    return specs
}

function createDramaElements(modules) {
    return [{
        "name": "sp",
        "pmType": "node",
        "content": "chunk*",
        "group": "block",
        "desc": modules['sp'].description
    }]
}

async function run() {
    const modules = load()

    const elements = [], attrs = {}

    // elements.push(...createPhraseElements(modules))
    elements.push(...createDramaElements(modules))
    elements.push( {
        "name": "p",
        "pmType": "node",
        "content": "inline*",
        "group": "chunk",
        "desc": "marks paragraphs in prose."
    })
    elements.push( {
        "name": "div",
        "pmType": "node",
        "content": "(chunk|block)*",
        "group": "block"
    })

    const teiSimpleConfig = { elements, attrs }
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