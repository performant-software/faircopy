const fs = require('fs');
const jsdom = require("jsdom");
const { parseContent, parseGroups } = require('./parse-content');
const { getKeys, loadLocalizedString } = require('./parse-util')
const { JSDOM } = jsdom;

// This module knows how to parse ODD XML specs and definitions into useful JSON objects
const load = function load(teiSpecsDir, elementIdents) {
    const specs = {}

    // recursively load module dependencies
    // assumes 1-1 spec files to specifications
    const loadSpec = (specName) => {
        if( !specs[specName] ) {
            const specPath = `${teiSpecsDir}/${specName}.xml`
            const moduleSpecs = parseSpecs(specPath)
            for( const moduleSpec of moduleSpecs ) {
                specs[moduleSpec.ident] = moduleSpec
                // load membership dependencies
                if( moduleSpec.memberships ) {
                    for( const membership of moduleSpec.memberships ) {
                        loadSpec(membership)
                    }                    
                }
                // parse and replace content macros
                console.log('parsing '+specName)
                if( moduleSpec.content && typeof moduleSpec.content === 'string' && moduleSpec.content.startsWith('macro.') ) {
                    const macroIdent = moduleSpec.content
                    loadSpec(macroIdent)
                    moduleSpec.content = specs[macroIdent].content
                }
                // presently, we don't do anything with attRef, which isn't used as of TEI 4.3.0
            }
        }
    }

    // load the element specs and their dependencies
    for( const ident of elementIdents ) {
        loadSpec(ident)
    }

    // now resolve the memberships into groups
    parseGroups(specs)

    return specs
}

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
    const usage = el.getAttribute('usage')
    const mode = el.getAttribute('mode')
    const description = loadLocalizedString(el, "desc")
    const datatypeEl = el.getElementsByTagName('datatype')[0]
    let dataType = null, minOccurs = null, maxOccurs = null
    if( datatypeEl ) {
        minOccurs = datatypeEl.getAttribute('minOccurs')
        maxOccurs = datatypeEl.getAttribute('maxOccurs')
        const dataRefEl = datatypeEl ? datatypeEl.getElementsByTagName('dataRef')[0] : null
        dataType = dataRefEl ? dataRefEl.getAttribute('key') : null
        if( dataRefEl && !dataType ) {
            dataType = dataRefEl.getAttribute('name') 
        }    
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
   
    return { ident, description, dataType, minOccurs, maxOccurs, valList, valListType, usage, mode } // defaultVal }
}

function parseAttRef( el ) {
    const attClass = el.getAttribute('class')
    const name = el.getAttribute('name')
    return { ref: true, attClass, name }
}

function parseAttList( el ) {    
    const attList = []
    const attDefEls = el.getElementsByTagName('attDef')
    for( let i=0; i < attDefEls.length; i++ ) {
        const attDefEl = attDefEls[i]
        attList.push( parseAttDef(attDefEl) )
    }
    const attRefEls = el.getElementsByTagName('attRef')
    for( let i=0; i < attRefEls.length; i++ ) {
        const attRefEl = attRefEls[i]
        attList.push( parseAttRef(attRefEl) )
    }
    
    // TODO attList - collapse nested attLists.. do these exist? 

    return attList
}

function parseElementSpec( el ) {
    const ident = el.getAttribute('ident')
    const module = el.getAttribute('module')
    const classesEl = el.getElementsByTagName('classes')[0]
    const memberships = getKeys(classesEl,'memberOf')
    const description = loadLocalizedString(el, "desc")
    const gloss = loadLocalizedString(el, "gloss")
    const attListEl = el.getElementsByTagName('attList')[0]
    const attrs = attListEl ? parseAttList(attListEl) : []
    const contentEl = el.getElementsByTagName('content')[0]
    const content = parseContent(contentEl)

    return { ident, module, gloss, memberships, description, attrs, content }
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

function parseSpecs( specPath ) {
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
module.exports.load = load;