const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// This module knows how to parse ODD XML specs and definitions into useful JSON objects

const getKeys = (el,keyTag) => {
    const keys = []
    const tags = el ? el.getElementsByTagName(keyTag) : []

    for (let i = 0; i < tags.length; i++) {
        const tagEl = tags[i]
        if( keyTag === tagEl.localName )  {
            keys.push( tagEl.getAttribute('key') )    
        }
    } 
    return keys   
}

function loadLocalizedString(xmlDoc, tagName) {
    // Load the description of this element
    let str = ""
    const descEls = xmlDoc.getElementsByTagName(tagName)
    for( let i=0; i < descEls.length; i++ ) {
        const strEl = descEls[i]
        if( strEl.getAttribute("xml:lang") === "en" ) {
            // TODO flatten out newlines and runs of whitespace
            str = strEl.innerHTML
        }
    }
    return str
}

function parseClassSpec( el ) {
    const ident = el.getAttribute('ident')
    return { ident }
}

function parseAttList( el ) {
    return []
}

function parseElementSpec( el ) {
    const ident = el.getAttribute('ident')
    const classesEl = el.getElementsByTagName('classes')[0]
    const memberships = getKeys(classesEl,'memberOf')
    const description = loadLocalizedString(el, "desc")
    const gloss = loadLocalizedString(el, "gloss")
    const attListEl = el.getElementsByTagName('attList')[0]
    const attrs = parseAttList(attListEl)

    // const contentEl = el.getElementsByTagName('content')[0]
    // const refs = [ 
    //     ...getKeys(contentEl,'classRef'),
    //     ...getKeys(contentEl,'elementRef'),
    //     ...getKeys(contentEl,'macroRef') 
    // ]

    return { ident, gloss, memberships, description, attrs }
}

function parseMacroSpec( el ) {
    const ident = el.getAttribute('ident')
    return { ident }
}

function parseDataSpec( el ) {
    const ident = el.getAttribute('ident')
    return { ident }
}

const parseSpecs = function parseSpecs( specPath ) {
    const specXML = fs.readFileSync(specPath, "utf8")
    const specDOM = new JSDOM(specXML, { contentType: "text/xml" })
    const xmlDoc = specDOM.window.document;

    // Is this a class spec, an element spec, a macroSpec, or a dataSpec, some combination?
    const classSpecEls = xmlDoc.getElementsByTagName('classSpec')
    const elementSpecEls = xmlDoc.getElementsByTagName('elementSpec')
    const macroSpecEls = xmlDoc.getElementsByTagName('macroSpec')
    const dataSpecEls = xmlDoc.getElementsByTagName('dataSpec')

    const classSpecs = [], elementSpecs = [], macroSpecs = [], dataSpecs = []

   // pull all the objects of each type and parse them
   for( let i=0; i < classSpecEls.length; i++ ) {
        const classSpecEl = classSpecEls[i]
        classSpecs.push( parseClassSpec(classSpecEl) )
    }
    for( let i=0; i < elementSpecEls.length; i++ ) {
        const elementSpecEl = elementSpecEls[i]
        elementSpecs.push( parseElementSpec(elementSpecEl) )
    }
    for( let i=0; i < macroSpecEls.length; i++ ) {
        const macroSpecEl = macroSpecEls[i]
        macroSpecs.push( parseMacroSpec(macroSpecEl) )
    }
    for( let i=0; i < dataSpecEls.length; i++ ) {
        const dataSpecEl = dataSpecEls[i]
        dataSpecs.push( parseDataSpec(dataSpecEl) )
    }

    return [ ...classSpecs, ...elementSpecs, ...macroSpecs, ...dataSpecs ]
}

// EXPORTS /////////////
module.exports.parseSpecs = parseSpecs;