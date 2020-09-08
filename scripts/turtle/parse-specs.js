const fs = require('fs');
const jsdom = require("jsdom");
const { parseContent, parseGroups } = require('./parse-content');
const { getKeys, loadLocalizedString } = require('./parse-util')
const { JSDOM } = jsdom;

function parseClassSpec( el ) {
    const ident = el.getAttribute('ident')
    const classesEl = el.getElementsByTagName('classes')[0]
    const memberships = getKeys(classesEl,'memberOf')
    const attListEl = el.getElementsByTagName('attList')[0]
    const attrs = attListEl ? parseAttList(attListEl) : []
    return { ident, memberships, attrs }
}

function parseAttDef( el ) {
    const ident = el.getAttribute('ident')
    const description = loadLocalizedString(el, "desc")
    const datatypeEl = el.getElementsByTagName('datatype')[0]
    const minOccurs = datatypeEl.getAttribute('minOccurs')
    const maxOccurs = datatypeEl.getAttribute('maxOccurs')
    const dataRefEl = datatypeEl ? datatypeEl.getElementsByTagName('dataRef')[0] : null
    let dataType = dataRefEl ? dataRefEl.getAttribute('key') : null
    if( dataRefEl && !dataType ) {
        dataType = dataRefEl.getAttribute('name') 
    }

    const valListEl = el.getElementsByTagName('valList')[0]
    let valListType = valListEl ? valListEl.getAttribute('type') : null
    valListType = valListType ? valListType : 'open'
    const valList = valListEl ? [] : null
    if( valListEl ) {
        const valItemEls = valListEl.getElementsByTagName('valItem')
        for( let i=0; i < valItemEls.length; i++ ) {
            const valItemEl = valItemEls[i]
            const valIdent = valItemEl.getAttribute('ident')
            const valDesc = loadLocalizedString(valItemEl, 'desc')
            valList.push({ ident: valIdent, desc: valDesc })
        }
    }
   
    return { ident, description, dataType, minOccurs, maxOccurs, valList, valListType } //, usage, defaultVal }
}

function parseAttList( el ) {    
    const attList = []
    const attDefEls = el.getElementsByTagName('attDef')
    for( let i=0; i < attDefEls.length; i++ ) {
        const attDefEl = attDefEls[i]
        attList.push( parseAttDef(attDefEl) )
    }
    // for refs, just return a string
    const attRefEls = el.getElementsByTagName('attRef')
    for( let i=0; i < attRefEls.length; i++ ) {
        const attRefEl = attRefEls[i]
        attList.push( attRefEl )
    }
    
    // TODO attList - collapse nested attLists.. do these exist? 

    return attList
}

function parseElementSpec( el ) {
    const ident = el.getAttribute('ident')
    const classesEl = el.getElementsByTagName('classes')[0]
    const memberships = getKeys(classesEl,'memberOf')
    const description = loadLocalizedString(el, "desc")
    const gloss = loadLocalizedString(el, "gloss")
    const attListEl = el.getElementsByTagName('attList')[0]
    const attrs = attListEl ? parseAttList(attListEl) : []
    const group = parseGroups(memberships)
    const contentEl = el.getElementsByTagName('content')[0]
    const content = parseContent(contentEl)

    return { ident, gloss, memberships, description, attrs, content, group }
}

function parseMacroSpec( el ) {
    const ident = el.getAttribute('ident')
    const contentEl = el.getElementsByTagName('content')[0]
    const content = parseContent(contentEl)
    return { ident, content }
}

function parseDataSpec( el ) {
    const ident = el.getAttribute('ident')
    return { ident }
}

// This module knows how to parse ODD XML specs and definitions into useful JSON objects
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